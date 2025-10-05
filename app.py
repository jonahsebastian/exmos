# app.py - CORRECTED VERSION WITH DUAL INPUT SUPPORT
from flask import Flask, request, jsonify, render_template
import joblib
import numpy as np

app = Flask(__name__)
# Load the model (expects 4 features: koi_period, koi_fpflag_nt, koi_fpflag_ss, koi_fpflag_co)
model = joblib.load('exoplanet_model_final.joblib')

def convert_to_model_features(user_inputs):
    """
    Convert user-friendly inputs to model features
    User inputs: [orbital_period, transit_depth, planet_radius, stellar_temp, stellar_mass]
    Model expects: [koi_period, koi_fpflag_nt, koi_fpflag_ss, koi_fpflag_co]
    """
    orbital_period = user_inputs[0]
    transit_depth = user_inputs[1]
    planet_radius = user_inputs[2]
    stellar_temp = user_inputs[3]
    stellar_mass = user_inputs[4]
    
    # koi_period is directly used
    koi_period = orbital_period
    
    # Calculate false positive flags based on scientific criteria
    # These are heuristic rules based on typical exoplanet characteristics
    
    # koi_fpflag_nt: Not Transit-Like (1 if suspicious, 0 if good)
    # Suspicious if transit depth is too shallow or planet radius is unrealistic
    koi_fpflag_nt = 1 if (transit_depth < 10 or planet_radius < 0.5 or planet_radius > 30) else 0
    
    # koi_fpflag_ss: Stellar Eclipse (1 if suspicious, 0 if good)
    # Suspicious if characteristics suggest it might be a stellar eclipse
    # Large transit depth with large radius suggests binary star system
    koi_fpflag_ss = 1 if (transit_depth > 10000 and planet_radius > 15) else 0
    
    # koi_fpflag_co: Centroid Offset (1 if suspicious, 0 if good)
    # This is harder to derive from basic parameters, use conservative estimate
    # Flag if stellar properties are unusual or period is very short
    koi_fpflag_co = 1 if (orbital_period < 0.5 or stellar_temp < 3000 or stellar_temp > 8000) else 0
    
    return [koi_period, koi_fpflag_nt, koi_fpflag_ss, koi_fpflag_co]

@app.route('/')
def landing():
    return render_template('landing.html')

@app.route('/home')
def home():
    return render_template('home.html')

@app.route('/manual')
def manual():
    return render_template('manual.html')

@app.route('/csv')
def csv():
    return render_template('csv.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(force=True)
        features = np.array(data['features'], dtype=float)
        
        # Check if input is 5 features (manual) or 4 features (CSV)
        if len(features) == 5:
            # Manual input - convert to model features
            model_features = convert_to_model_features(features)
            model_features_array = np.array(model_features).reshape(1, -1)
        elif len(features) == 4:
            # CSV input - use directly
            model_features_array = features.reshape(1, -1)
        else:
            return jsonify({'error': f'Expected 4 or 5 features, got {len(features)}'}), 400
        
        prediction = model.predict(model_features_array)[0]
        
        return jsonify({'prediction': prediction})
    except ValueError as e:
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)