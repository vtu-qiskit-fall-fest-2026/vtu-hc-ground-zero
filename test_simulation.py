from fastapi.testclient import TestClient
from app.main import app
from app.simulation import Config, simulate, simulate_batch, post_process_key, get_quantum_circuit_schema

client = TestClient(app)

def test_health():
    res = client.get('/api/health').json()
    assert res['status'] == 'ok'
    assert 'features' in res

def test_ideal():
    r = simulate(Config(bits=4096, seed=1))
    assert r['qber'] == 0.0 and r['status'] == 'PASS'
    assert len(r['bits']) == 4096
    assert 'alice_state' in r['bits'][0]

def test_full_eve_rate():
    r = simulate(Config(bits=20000, eve=True, eve_intensity=1.0, seed=2))
    assert 20.0 < r['qber'] < 30.0 and r['status'] == 'ABORT'

def test_partial_eve_rate():
    # 50% Eve interception intensity should yield approximately 12.5% QBER (+- 3%)
    r = simulate(Config(bits=20000, eve=True, eve_intensity=0.5, seed=5))
    assert 9.5 < r['qber'] < 15.5
    assert r['scenario'] == 'partial_eve'

def test_noise_rate():
    r = simulate(Config(bits=20000, noise=True, noise_probability=0.10, seed=3))
    assert 8.0 < r['qber'] < 12.0

def test_combined_rate():
    r = simulate(Config(bits=20000, eve=True, eve_intensity=1.0, noise=True, noise_probability=0.1, seed=4))
    assert r['qber'] > 25.0

def test_seed_reproducible():
    c = Config(bits=64, eve=True, seed=9)
    assert simulate(c) == simulate(c)

def test_insufficient():
    assert simulate(Config(bits=16, seed=1))['status'] == 'INSUFFICIENT_DATA'

def test_threshold():
    r = simulate(Config(bits=20000, noise=True, noise_probability=0.1, threshold=5.0, seed=2))
    assert r['status'] == 'ABORT'

def test_validation():
    assert client.post('/api/simulations', json={'bits': 0}).status_code == 422

def test_unknown_id():
    assert client.get('/api/simulations/missing_id_99999').status_code == 404

def test_payment_outcomes():
    for config, expected in [
        ({'bits': 4096, 'seed': 1}, 'ADDITIONAL_VERIFICATION_REQUIRED'),
        ({'bits': 4096, 'eve': True, 'seed': 1}, 'BLOCKED'),
        ({'bits': 16, 'seed': 1}, 'PENDING_INSUFFICIENT_DATA')
    ]:
        s = client.post('/api/simulations', json=config).json()
        p = client.post('/api/payments/demo/verify', json={'simulation_id': s['simulation_id']}).json()
        assert p['demo_payment_status'] == expected
        assert not p['money_transferred']
        assert 'timeline' in p

def test_batch_simulation():
    res = client.post('/api/simulations/batch', json={
        'runs': 30,
        'bits': 256,
        'eve': True,
        'eve_intensity': 1.0,
        'seed': 42
    })
    assert res.status_code == 200
    data = res.json()
    assert data['runs_count'] == 30
    assert 18.0 < data['mean_qber'] < 32.0
    assert 'ci95_lower' in data
    assert 'distribution' in data
    assert len(data['distribution']) == 10

def test_post_processing():
    # Run a clean simulation where QBER = 0%
    sim = client.post('/api/simulations', json={'bits': 512, 'seed': 777}).json()
    post_res = client.post('/api/simulations/post-processing', json={'simulation_id': sim['simulation_id']})
    assert post_res.status_code == 200
    pdata = post_res.json()
    assert pdata['status'] == 'SUCCESS'
    assert pdata['final_secure_key_length'] > 0
    assert 'final_key_hex' in pdata

def test_circuit_schema():
    res = client.get('/api/simulations/circuit')
    assert res.status_code == 200
    assert 'gates' in res.json()

def test_history_and_exports():
    hist = client.get('/api/experiments/history').json()
    assert 'experiments' in hist
    assert hist['count'] >= 1

    json_export = client.get('/api/experiments/export/json')
    assert json_export.status_code == 200

    csv_export = client.get('/api/experiments/export/csv')
    assert csv_export.status_code == 200
    assert 'simulation_id' in csv_export.text

    report = client.get('/api/experiments/export/report')
    assert report.status_code == 200
    assert 'QORVEX 2.0' in report.text
