import random
import os
from datetime import datetime, timedelta
from elasticsearch import Elasticsearch, helpers
import warnings
import pytz
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

load_dotenv()
app = Flask(__name__)
es_username = os.getenv('ELASTICSEARCH_USERNAME')
es_password = os.getenv('ELASTICSEARCH_PASSWORD')
es_host = os.getenv('ELASTICSEARCH_HOST')

# Initialize Elasticsearch client
es = Elasticsearch(
    es_host,
    basic_auth=(es_username, es_password),
    verify_certs=False
)

warnings.filterwarnings("ignore")

# Define brands
brands = ["Nike", "Adidas", "Puma", "Reebok", "Under Armour"]

# Example sentences
sentences = [
    "I absolutely love my new {brand} shoes!",
    "Just got my hands on a pair of {brand} sneakers. So comfortable!",
    "{brand} always delivers the best quality products.",
    "Not a fan of {brand} anymore after the recent issues.",
    "Training with my {brand} gear feels amazing.",
    "{brand} has really stepped up their game recently!",
    "I can't believe how durable my {brand} shoes are.",
    "{brand} is overrated. I expected better.",
    "Everyone keeps asking about my new {brand} outfit.",
    "Working out is so much better with my {brand} gear.",
    "The customer service at {brand} was exceptional.",
    "Disappointed with my recent {brand} purchase.",
    "My friends can't stop talking about their {brand} collection.",
    "{brand} just launched a new product, and I'm impressed!",
    "I always trust {brand} when it comes to sportswear.",
]


# Generate fake data
def generate_fake_data(num_posts=1000):
    data = []
    # Limit to the past 7 days
    start_date = datetime.now(pytz.utc) - timedelta(days=7)

    for _ in range(num_posts):
        # Generate a random timestamp within the 7-day range
        random_seconds = random.randint(0, 7 * 24 * 60 * 60)
        date = (start_date + timedelta(seconds=random_seconds)).date()  # Only keep the date part
        
        # Randomly choose a brand and a sentence
        brand = random.choice(brands)
        text = random.choice(sentences).format(brand=brand)
        
        # Append a fake post
        data.append({
            "_index": "brand_mentions",
            "_source": {
                "date": date.isoformat(),  # ISO format for dates (YYYY-MM-DD)
                "text": text
            }
        })
    return data

# Push data to ElasticSearch
def push_data_to_es(data):
    helpers.bulk(es, data)
    print("Data inserted successfully!")

@app.route('/')
def index():
    return render_template('index.html')

# API: Mentions Over Time
@app.route('/mentions_over_time', methods=['GET'])
def mentions_over_time():
    keyword = request.args.get('keyword', '')  # Get the keyword from query parameters
    if not keyword:
        return jsonify({"error": "Keyword parameter is required"}), 400

    response = es.search(index="brand_mentions", body={
        "query": {
            "match": {  # Match documents where the text contains the keyword
                "text": keyword
            }
        },
        "size": 0,  # Don't return individual documents, only aggregation
        "aggs": {
            "mentions_over_time": {
                "terms": {
                    "field": "date",
                    "size": 365,  # Capture up to 365 unique days
                    "order": { "_key": "asc" }  # Sort by date in ascending order
                }
            }
        }
    })

    buckets = response['aggregations']['mentions_over_time']['buckets']
    return jsonify([{"date": b['key'], "count": b['doc_count']} for b in buckets])


@app.route('/get_reviews', methods=['GET'])
def get_reviews():
    brand = request.args.get('brand', '').strip()
    if not brand:
        return jsonify({"error": "Brand parameter is required"}), 400

    # Elasticsearch query to match text containing the brand
    try:
        response = es.search(index="brand_mentions", body={
            "query": {
                "match": {  # Match documents where 'text' contains the brand
                    "text": brand
                }
            },
            "size": 100  # Fetch up to 100 reviews
        })

        # Extract 'text' and 'date' fields from each document in the response
        reviews = [
            {
                "text": hit['_source']['text'],
                "date": hit['_source'].get('date', 'Unknown')  # Get date if available
            }
            for hit in response['hits']['hits']
        ]

        return jsonify(reviews)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    if es.indices.exists(index="brand_mentions"):
        es.indices.delete(index="brand_mentions")
    data = generate_fake_data()
    push_data_to_es(data)
    app.run(debug=True)