#!/usr/bin/env python3
"""
YOLOv8 Fire and Smoke Detection Inference Script
Runs inference on a single image and returns detection results as JSON
"""

import sys
import json
import base64
from io import BytesIO
from PIL import Image
import numpy as np

def load_model():
    """Load YOLOv8 model"""
    try:
        from ultralytics import YOLO
        import os
        # Suppress verbose YOLO output
        os.environ['YOLO_VERBOSE'] = 'False'
        model = YOLO('yolov8n.pt', verbose=False)  # Load YOLOv8n model
        return model
    except Exception as e:
        error_msg = {'success': False, 'error': f'Failed to load model: {str(e)}'}
        print(json.dumps(error_msg), file=sys.stderr)
        sys.exit(1)

def decode_base64_image(base64_string):
    """Decode base64 image string to PIL Image"""
    try:
        # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        image = Image.open(BytesIO(image_data))
        return image
    except Exception as e:
        error_msg = {'success': False, 'error': f'Failed to decode image: {str(e)}'}
        print(json.dumps(error_msg), file=sys.stderr)
        sys.exit(1)

def run_inference(model, image):
    """Run YOLOv8 inference on image"""
    try:
        # Run inference with verbose=False to suppress output
        results = model(image, verbose=False)
        
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                detection = {
                    'class': result.names[int(box.cls[0])],
                    'confidence': float(box.conf[0]),
                    'bbox': box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                }
                detections.append(detection)
        
        # Check if fire or smoke detected
        fire_detected = any(d['class'].lower() in ['fire', 'smoke'] for d in detections)
        
        return {
            'success': True,
            'fire_detected': fire_detected,
            'detections': detections,
            'num_detections': len(detections)
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Inference failed: {str(e)}'
        }

def main():
    """Main function"""
    try:
        # Read base64 image from stdin (better for large data)
        base64_image = sys.stdin.read().strip()
        
        if not base64_image:
            print(json.dumps({'success': False, 'error': 'No image data provided'}), file=sys.stderr)
            sys.exit(1)
        
        # Load model
        model = load_model()
        
        # Decode image
        image = decode_base64_image(base64_image)
        
        # Run inference
        result = run_inference(model, image)
        
        # Output result as JSON
        print(json.dumps(result))
    except Exception as e:
        error_result = {
            'success': False,
            'error': f'Unexpected error: {str(e)}',
            'type': type(e).__name__
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
