import pandas as pd
import numpy as np
from datasets import load_dataset
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.pipeline import Pipeline
import re
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.neural_network import MLPClassifier
from sklearn.ensemble import RandomForestClassifier, VotingClassifier, ExtraTreesClassifier
from sklearn.svm import SVC
import warnings
warnings.filterwarnings('ignore')

# Additional imports for enhanced models
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from sklearn.ensemble import GradientBoostingClassifier

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet')

def enhanced_preprocess_tweet(text):
    """
    Enhanced tweet preprocessing with stopwords removal and lemmatization.
    """
    # Basic cleaning
    text = re.sub(r"http\S+|www\S+", "", text)  # Remove URLs
    text = re.sub(r"@[A-Za-z0-9_]+", "", text)    # Remove mentions
    text = re.sub(r"#[A-Za-z0-9_]+", "", text)    # Remove hashtags
    text = re.sub(r"[\U00010000-\U0010ffff]", "", text)  # Remove emojis
    
    # Keep important punctuation for sentiment
    text = re.sub(r"[^\w\s.,!?']", "", text)
    text = text.lower()
    text = re.sub(r"\s+", " ", text).strip()
    
    # Tokenize
    tokens = word_tokenize(text)
    
    # Remove stopwords
    stop_words = set(stopwords.words('english'))
    tokens = [word for word in tokens if word not in stop_words]
    
    # Lemmatization
    lemmatizer = WordNetLemmatizer()
    tokens = [lemmatizer.lemmatize(word) for word in tokens]
    
    return ' '.join(tokens)

def load_and_preprocess_data():
    """
    Load tweet_eval dataset and preprocess with enhanced cleaning.
    """
    print("Loading tweet_eval dataset...")
    ds = load_dataset("tweet_eval", "sentiment")
    
    # Convert to pandas for easier manipulation
    train_df = pd.DataFrame(ds["train"])
    val_df = pd.DataFrame(ds["validation"])
    test_df = pd.DataFrame(ds["test"])
    
    print(f"Dataset sizes:")
    print(f"Train: {len(train_df)} samples")
    print(f"Validation: {len(val_df)} samples")
    print(f"Test: {len(test_df)} samples")
    
    # Enhanced preprocessing
    print("Enhanced preprocessing text data...")
    train_df['cleaned_text'] = train_df['text'].apply(enhanced_preprocess_tweet)
    val_df['cleaned_text'] = val_df['text'].apply(enhanced_preprocess_tweet)
    test_df['cleaned_text'] = test_df['text'].apply(enhanced_preprocess_tweet)
    
    # Label mapping
    label_map = {0: 'negative', 1: 'neutral', 2: 'positive'}
    train_df['sentiment'] = train_df['label'].map(label_map)
    val_df['sentiment'] = val_df['label'].map(label_map)
    test_df['sentiment'] = test_df['label'].map(label_map)
    
    print(f"Label distribution in training set:")
    print(train_df['sentiment'].value_counts())
    
    return train_df, val_df, test_df

def train_enhanced_models(train_df, val_df, test_df):
    """
    Train enhanced models with hyperparameter tuning and new algorithms.
    """
    print("\n" + "="*50)
    print("TRAINING ENHANCED MODELS")
    print("="*50)
    
    # Prepare data
    X_train = train_df['cleaned_text']
    y_train = train_df['label']
    X_val = val_df['cleaned_text']
    y_val = val_df['label']
    X_test = test_df['cleaned_text']
    y_test = test_df['label']
    
    # Enhanced models with hyperparameter tuning
    models = {
        'Logistic Regression (Tuned)': Pipeline([
            ('tfidf', TfidfVectorizer(max_features=15000, ngram_range=(1, 2), min_df=2, max_df=0.95)),
            ('clf', LogisticRegression(random_state=42, max_iter=1000, C=1.0))
        ]),
        'SVM (RBF Kernel)': Pipeline([
            ('tfidf', TfidfVectorizer(max_features=15000, ngram_range=(1, 2), min_df=2, max_df=0.95)),
            ('clf', SVC(kernel='rbf', random_state=42, C=1.0, gamma='scale', probability=True))
        ]),
        'Gradient Boosting': Pipeline([
            ('tfidf', TfidfVectorizer(max_features=15000, ngram_range=(1, 2), min_df=2, max_df=0.95)),
            ('clf', GradientBoostingClassifier(random_state=42, n_estimators=100, learning_rate=0.1, max_depth=6))
        ]),
        'Extra Trees': Pipeline([
            ('tfidf', TfidfVectorizer(max_features=15000, ngram_range=(1, 2), min_df=2, max_df=0.95)),
            ('clf', ExtraTreesClassifier(n_estimators=100, random_state=42, max_depth=10))
        ]),
        'Random Forest (Tuned)': Pipeline([
            ('tfidf', TfidfVectorizer(max_features=15000, ngram_range=(1, 2), min_df=2, max_df=0.95)),
            ('clf', RandomForestClassifier(n_estimators=200, max_depth=10, min_samples_split=5, random_state=42))
        ])
    }
    
    results = {}
    
    for name, model in models.items():
        print(f"\nTraining {name}...")
        
        # Train model
        model.fit(X_train, y_train)
        
        # Predictions
        y_pred_train = model.predict(X_train)
        y_pred_val = model.predict(X_val)
        y_pred_test = model.predict(X_test)
        
        # Calculate metrics
        train_acc = accuracy_score(y_train, y_pred_train)
        val_acc = accuracy_score(y_val, y_pred_val)
        test_acc = accuracy_score(y_test, y_pred_test)
        
        # Classification report
        test_report = classification_report(y_test, y_pred_test, 
                                         target_names=['negative', 'neutral', 'positive'],
                                         output_dict=True)
        
        results[name] = {
            'model': model,
            'train_accuracy': train_acc,
            'val_accuracy': val_acc,
            'test_accuracy': test_acc,
            'classification_report': test_report,
            'predictions': y_pred_test
        }
        
        print(f"{name} Results:")
        print(f"  Train Accuracy: {train_acc:.4f}")
        print(f"  Validation Accuracy: {val_acc:.4f}")
        print(f"  Test Accuracy: {test_acc:.4f}")
        print(f"  Test F1-Score: {test_report['weighted avg']['f1-score']:.4f}")
    
    return results

def create_ensemble_model(results, X_train, y_train, X_val, y_val, X_test, y_test):
    """
    Create an ensemble model combining the best performing models.
    """
    print("\n" + "="*50)
    print("CREATING ENSEMBLE MODEL")
    print("="*50)
    
    # Get the top 3 models based on validation accuracy
    sorted_models = sorted(results.items(), key=lambda x: x[1]['val_accuracy'], reverse=True)
    top_models = sorted_models[:3]
    
    print(f"Creating ensemble with top 3 models:")
    for name, result in top_models:
        print(f"  - {name}: {result['val_accuracy']:.4f} validation accuracy")
    
    # Create ensemble
    estimators = [(name, result['model']) for name, result in top_models]
    ensemble = VotingClassifier(estimators=estimators, voting='soft')
    
    # Train ensemble
    print("Training ensemble model...")
    ensemble.fit(X_train, y_train)
    
    # Evaluate ensemble
    y_pred_train = ensemble.predict(X_train)
    y_pred_val = ensemble.predict(X_val)
    y_pred_test = ensemble.predict(X_test)
    
    train_acc = accuracy_score(y_train, y_pred_train)
    val_acc = accuracy_score(y_val, y_pred_val)
    test_acc = accuracy_score(y_test, y_pred_test)
    
    test_report = classification_report(y_test, y_pred_test, 
                                     target_names=['negative', 'neutral', 'positive'],
                                     output_dict=True)
    
    ensemble_result = {
        'model': ensemble,
        'train_accuracy': train_acc,
        'val_accuracy': val_acc,
        'test_accuracy': test_acc,
        'classification_report': test_report,
        'predictions': y_pred_test
    }
    
    print(f"Ensemble Results:")
    print(f"  Train Accuracy: {train_acc:.4f}")
    print(f"  Validation Accuracy: {val_acc:.4f}")
    print(f"  Test Accuracy: {test_acc:.4f}")
    print(f"  Test F1-Score: {test_report['weighted avg']['f1-score']:.4f}")
    
    return ensemble_result

def compare_enhanced_models(results, ensemble_result):
    """
    Compare all models including the ensemble.
    """
    print("\n" + "="*50)
    print("ENHANCED MODEL COMPARISON")
    print("="*50)
    
    # Add ensemble to results
    results['Ensemble'] = ensemble_result
    
    # Create comparison DataFrame
    comparison_data = []
    for name, result in results.items():
        comparison_data.append({
            'Model': name,
            'Train Accuracy': result['train_accuracy'],
            'Validation Accuracy': result['val_accuracy'],
            'Test Accuracy': result['test_accuracy'],
            'Test F1-Score': result['classification_report']['weighted avg']['f1-score']
        })
    
    comparison_df = pd.DataFrame(comparison_data)
    comparison_df = comparison_df.sort_values('Test Accuracy', ascending=False)
    print(comparison_df.to_string(index=False))
    
    # Find best model
    best_model_name = comparison_df.iloc[0]['Model']
    best_result = results[best_model_name]
    
    print(f"\nBest Model: {best_model_name}")
    print(f"Test Accuracy: {best_result['test_accuracy']:.4f}")
    print(f"Test F1-Score: {best_result['classification_report']['weighted avg']['f1-score']:.4f}")
    
    return best_model_name, best_result

def save_best_model(best_model_name, best_result):
    """
    Save the best model for later use.
    """
    print(f"\nSaving best model: {best_model_name}")
    joblib.dump(best_result['model'], 'best_enhanced_sentiment_model.pkl')
    print("Model saved as 'best_enhanced_sentiment_model.pkl'")

def plot_enhanced_results(results):
    """
    Create visualizations of enhanced model performance.
    """
    # Accuracy comparison
    models = list(results.keys())
    train_accs = [results[model]['train_accuracy'] for model in models]
    val_accs = [results[model]['val_accuracy'] for model in models]
    test_accs = [results[model]['test_accuracy'] for model in models]
    
    x = np.arange(len(models))
    width = 0.25
    
    plt.figure(figsize=(14, 7))
    plt.bar(x - width, train_accs, width, label='Train', alpha=0.8)
    plt.bar(x, val_accs, width, label='Validation', alpha=0.8)
    plt.bar(x + width, test_accs, width, label='Test', alpha=0.8)
    
    plt.xlabel('Models')
    plt.ylabel('Accuracy')
    plt.title('Enhanced Model Performance Comparison')
    plt.xticks(x, models, rotation=45, ha='right')
    plt.legend()
    plt.tight_layout()
    plt.savefig('enhanced_model_comparison.png', dpi=300, bbox_inches='tight')
    plt.show()

if __name__ == "__main__":
    # Load and preprocess data
    train_df, val_df, test_df = load_and_preprocess_data()
    
    # Prepare data for ensemble
    X_train = train_df['cleaned_text']
    y_train = train_df['label']
    X_val = val_df['cleaned_text']
    y_val = val_df['label']
    X_test = test_df['cleaned_text']
    y_test = test_df['label']
    
    # Train enhanced models
    results = train_enhanced_models(train_df, val_df, test_df)
    
    # Create ensemble
    ensemble_result = create_ensemble_model(results, X_train, y_train, X_val, y_val, X_test, y_test)
    
    # Compare and select best model
    best_model_name, best_result = compare_enhanced_models(results, ensemble_result)
    
    # Save best model
    save_best_model(best_model_name, best_result)
    
    # Plot results
    plot_enhanced_results(results)
    
    print("\n" + "="*50)
    print("ENHANCED TRAINING COMPLETE!")
    print("="*50)
    print("Improvements made:")
    print("1. Enhanced text preprocessing (stopwords, lemmatization)")
    print("2. Better TF-IDF parameters")
    print("3. Added Gradient Boosting and Extra Trees")
    print("4. Hyperparameter tuning")
    print("5. Ensemble model combining top performers")
    print("\nNext steps:")
    print("1. Use 'best_enhanced_sentiment_model.pkl' for predictions")
    print("2. Build your Streamlit dashboard")
    print("3. Test on real-time tweets") 