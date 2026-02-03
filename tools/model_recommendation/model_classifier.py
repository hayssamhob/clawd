import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier

class ModelRecommendationSystem:
    def __init__(self, config_path='~/clawd/config/model_recommendation.json'):
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        self.complexity_levels = [
            'TRIVIAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        ]
        
        self.models = {
            'TRIVIAL': ['claude-3-5-haiku', 'gpt-3.5-turbo'],
            'LOW': ['deepseek-v3', 'claude-3-5-sonnet'],
            'MEDIUM': ['claude-3-5-sonnet', 'gpt-4-turbo'],
            'HIGH': ['claude-sonnet-4-5', 'gpt-4'],
            'CRITICAL': ['claude-opus-4-5']
        }
        
        self.vectorizer = TfidfVectorizer()
        self.classifier = RandomForestClassifier()
    
    def train_complexity_classifier(self, training_data):
        """Train a model to classify task complexity"""
        X = self.vectorizer.fit_transform([task['text'] for task in training_data])
        y = [task['complexity'] for task in training_data]
        
        self.classifier.fit(X, y)
    
    def classify_task_complexity(self, task_text):
        """Determine the complexity of a given task"""
        vectorized_task = self.vectorizer.transform([task_text])
        predicted_complexity = self.classifier.predict(vectorized_task)[0]
        return predicted_complexity
    
    def recommend_model(self, task_text):
        """Recommend the most appropriate model for a task"""
        complexity = self.classify_task_complexity(task_text)
        
        # Model selection logic
        candidate_models = self.models.get(complexity, self.models['MEDIUM'])
        
        # Future: Implement more sophisticated scoring
        return candidate_models[0]  # For now, return first model
    
    def log_execution(self, task_text, model_used, success, tokens_used):
        """Log model performance for future improvement"""
        log_entry = {
            'task': task_text,
            'model': model_used,
            'success': success,
            'tokens_used': tokens_used
        }
        
        with open('~/clawd/logs/model_recommendation.jsonl', 'a') as f:
            f.write(json.dumps(log_entry) + '\n')

# Example usage
if __name__ == '__main__':
    recommender = ModelRecommendationSystem()
    
    # Simulated training data
    training_data = [
        {'text': 'Create a simple hello world script', 'complexity': 'TRIVIAL'},
        {'text': 'Develop a machine learning model for sentiment analysis', 'complexity': 'HIGH'}
    ]
    
    recommender.train_complexity_classifier(training_data)
    
    # Example recommendation
    task = "Build a complex data processing pipeline with multiple stages"
    recommended_model = recommender.recommend_model(task)
    print(f"Recommended Model for task: {recommended_model}")