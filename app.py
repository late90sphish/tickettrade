from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timedelta
import stripe

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///tickettrade.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret-key')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app)

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')  # optional in local dev; payment routes handle missing key

os.makedirs(app.config.get('UPLOAD_FOLDER', './uploads'), exist_ok=True)

# ==================== MODELS ====================

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    bio = db.Column(db.Text)
    avatar_url = db.Column(db.String(255))
    rating = db.Column(db.Float, default=0.0)
    total_reviews = db.Column(db.Integer, default=0)
    completed_sales = db.Column(db.Integer, default=0)
    completed_purchases = db.Column(db.Integer, default=0)
    email_verified = db.Column(db.Boolean, default=False)
    verified_at = db.Column(db.DateTime)
    stripe_customer_id = db.Column(db.String(255), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    listings = db.relationship('Listing', backref='seller', lazy=True, foreign_keys='Listing.seller_id')
    offers_made = db.relationship('Offer', backref='buyer', lazy=True, foreign_keys='Offer.buyer_id')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self, include_email=False):
        data = {
            'id': self.id,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'bio': self.bio,
            'avatar_url': self.avatar_url,
            'rating': self.rating,
            'total_reviews': self.total_reviews,
            'completed_sales': self.completed_sales,
            'completed_purchases': self.completed_purchases,
            'email_verified': self.email_verified,
            'created_at': self.created_at.isoformat(),
        }
        if include_email:
            data['email'] = self.email
        return data


class Listing(db.Model):
    __tablename__ = 'listings'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    seller_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50), nullable=False)
    condition = db.Column(db.String(20))
    original_purchase_price = db.Column(db.Float, nullable=False)
    asking_price = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='active')
    accepts_offers = db.Column(db.Boolean, default=True)
    seller_covers_fees = db.Column(db.Boolean, default=True)
    show_id = db.Column(db.Integer)
    show_date = db.Column(db.String(10))
    images = db.relationship('Image', backref='listing', lazy=True, cascade='all, delete-orphan')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = db.Column(db.DateTime, default=lambda: datetime.utcnow() + timedelta(days=30))
    offers = db.relationship('Offer', backref='listing', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self, include_offers=False):
        data = {
            'id': self.id,
            'seller': self.seller.to_dict(),
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'condition': self.condition,
            'original_purchase_price': self.original_purchase_price,
            'asking_price': self.asking_price,
            'status': self.status,
            'accepts_offers': self.accepts_offers,
            'images': [img.to_dict() for img in self.images],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'expires_at': self.expires_at.isoformat(),
            'seller_covers_fees': self.seller_covers_fees,
            'show_id': self.show_id,
            'show_date': self.show_date,
        }
        if include_offers:
            data['offers'] = [o.to_dict() for o in self.offers]
        return data


class Image(db.Model):
    __tablename__ = 'images'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id = db.Column(db.String(36), db.ForeignKey('listings.id'), nullable=False)
    url = db.Column(db.String(255), nullable=False)
    order = db.Column(db.Integer, default=0)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {'id': self.id, 'url': self.url, 'order': self.order}


class Offer(db.Model):
    __tablename__ = 'offers'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id = db.Column(db.String(36), db.ForeignKey('listings.id'), nullable=False, index=True)
    buyer_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    offered_price = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = db.Column(db.DateTime, default=lambda: datetime.utcnow() + timedelta(days=7))
    
    def to_dict(self):
        return {
            'id': self.id,
            'listing_id': self.listing_id,
            'buyer': self.buyer.to_dict(),
            'offered_price': self.offered_price,
            'status': self.status,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat(),
        }


class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id = db.Column(db.String(36), db.ForeignKey('listings.id'), nullable=False)
    seller_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    buyer_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    offer_id = db.Column(db.String(36), db.ForeignKey('offers.id'))
    amount = db.Column(db.Float, nullable=False)
    stripe_payment_intent = db.Column(db.String(255))
    status = db.Column(db.String(20), default='pending')
    escrow_held_at = db.Column(db.DateTime)
    buyer_confirmed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    def to_dict(self):
        return {
            'id': self.id,
            'listing_id': self.listing_id,
            'seller_id': self.seller_id,
            'buyer_id': self.buyer_id,
            'offer_id': self.offer_id,
            'amount': self.amount,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'escrow_held_at': self.escrow_held_at.isoformat() if self.escrow_held_at else None,
            'buyer_confirmed_at': self.buyer_confirmed_at.isoformat() if self.buyer_confirmed_at else None,
        }


# ==================== AUTH ROUTES ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data.get('email') or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 400
    
    user = User(email=data['email'], username=data['username'], first_name=data.get('first_name', ''), last_name=data.get('last_name', ''))
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    
    try:
        stripe_customer = stripe.Customer.create(email=user.email)
        user.stripe_customer_id = stripe_customer.id
        db.session.commit()
    except:
        pass
    
    access_token = create_access_token(identity=user.id)
    return jsonify({'message': 'User registered successfully', 'access_token': access_token, 'user': user.to_dict(include_email=True)}), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing email or password'}), 400
    user = User.query.filter_by(email=data['email']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    access_token = create_access_token(identity=user.id)
    return jsonify({'access_token': access_token, 'user': user.to_dict(include_email=True)}), 200


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict(include_email=True)), 200


# ==================== LISTING ROUTES ====================

@app.route('/api/listings', methods=['GET'])
def list_listings():
    page = request.args.get('page', 1, type=int)
    category = request.args.get('category')
    search = request.args.get('search')
    seller_id = request.args.get('seller_id')
    
    query = Listing.query.filter_by(status='active')
    if category:
        query = query.filter_by(category=category)
    if search:
        query = query.filter(Listing.title.ilike(f'%{search}%'))
    if seller_id:
        query = query.filter_by(seller_id=seller_id)
    
    Listing.query.filter(Listing.expires_at < datetime.utcnow(), Listing.status == 'active').update({'status': 'expired'})
    db.session.commit()
    
    paginated = query.order_by(Listing.created_at.desc()).paginate(page=page, per_page=20)
    return jsonify({'listings': [l.to_dict() for l in paginated.items], 'total': paginated.total, 'pages': paginated.pages, 'current_page': page}), 200


@app.route('/api/listings/<listing_id>', methods=['GET'])
def get_listing(listing_id):
    listing = Listing.query.get(listing_id)
    if not listing:
        return jsonify({'error': 'Listing not found'}), 404
    return jsonify(listing.to_dict(include_offers=True)), 200


@app.route('/api/listings', methods=['POST'])
@jwt_required()
def create_listing():
    user_id = get_jwt_identity()
    data = request.get_json()
    if not all(field in data for field in ['title', 'original_purchase_price', 'asking_price']):
        return jsonify({'error': 'Missing required fields'}), 400
    # Sellers may list up to face value, plus an allowance to pass on fees (5.4% + $0.30)
    max_allowed = data['original_purchase_price'] + (data['original_purchase_price'] * 0.054) + 0.30
    if data['asking_price'] > max_allowed:
        return jsonify({'error': 'Asking price cannot exceed face value plus fees'}), 400
    
    listing = Listing(seller_id=user_id, title=data['title'], description=data.get('description', ''), category=data.get('category', 'Phish'), condition=data.get('condition', 'good'), original_purchase_price=data['original_purchase_price'], asking_price=data['asking_price'], accepts_offers=data.get('accepts_offers', True), seller_covers_fees=data.get('seller_covers_fees', True), show_id=data.get('show_id'), show_date=data.get('show_date'))
    db.session.add(listing)
    db.session.commit()
    return jsonify(listing.to_dict()), 201


@app.route('/api/listings/<listing_id>', methods=['PUT'])
@jwt_required()
def update_listing(listing_id):
    user_id = get_jwt_identity()
    listing = Listing.query.get(listing_id)
    if not listing:
        return jsonify({'error': 'Listing not found'}), 404
    if listing.seller_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    if listing.status != 'active':
        return jsonify({'error': 'Cannot update non-active listing'}), 400
    
    data = request.get_json()
    if 'asking_price' in data:
        if data['asking_price'] > listing.original_purchase_price:
            return jsonify({'error': 'Asking price cannot exceed original purchase price'}), 400
        listing.asking_price = data['asking_price']
    if 'description' in data:
        listing.description = data['description']
    if 'accepts_offers' in data:
        listing.accepts_offers = data['accepts_offers']
    
    db.session.commit()
    return jsonify(listing.to_dict()), 200


@app.route('/api/listings/<listing_id>', methods=['DELETE'])
@jwt_required()
def delete_listing(listing_id):
    user_id = get_jwt_identity()
    listing = Listing.query.get(listing_id)
    if not listing:
        return jsonify({'error': 'Listing not found'}), 404
    if listing.seller_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    listing.status = 'removed'
    db.session.commit()
    return jsonify({'message': 'Listing removed'}), 200


# ==================== OFFER ROUTES ====================

@app.route('/api/offers', methods=['POST'])
@jwt_required()
def create_offer():
    buyer_id = get_jwt_identity()
    data = request.get_json()
    if not data.get('listing_id') or not data.get('offered_price'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    listing = Listing.query.get(data['listing_id'])
    if not listing:
        return jsonify({'error': 'Listing not found'}), 404
    if listing.status != 'active':
        return jsonify({'error': 'Listing is no longer active'}), 400
    if not listing.accepts_offers:
        return jsonify({'error': 'Seller is not accepting offers for this item'}), 400
    if data['offered_price'] > listing.asking_price:
        return jsonify({'error': 'Offer cannot exceed asking price'}), 400
    if listing.seller_id == buyer_id:
        return jsonify({'error': 'Cannot make offer on own listing'}), 400
    
    offer = Offer(listing_id=data['listing_id'], buyer_id=buyer_id, offered_price=data['offered_price'], message=data.get('message', ''))
    db.session.add(offer)
    db.session.commit()
    return jsonify(offer.to_dict()), 201


@app.route('/api/offers/<offer_id>/accept', methods=['POST'])
@jwt_required()
def accept_offer(offer_id):
    seller_id = get_jwt_identity()
    offer = Offer.query.get(offer_id)
    if not offer:
        return jsonify({'error': 'Offer not found'}), 404
    if offer.listing.seller_id != seller_id:
        return jsonify({'error': 'Unauthorized'}), 403
    if offer.status != 'pending':
        return jsonify({'error': 'Offer is no longer pending'}), 400
    
    offer.status = 'accepted'
    for other_offer in Offer.query.filter(Offer.listing_id == offer.listing_id, Offer.id != offer_id, Offer.status == 'pending'):
        other_offer.status = 'rejected'
    db.session.commit()
    return jsonify({'message': 'Offer accepted', 'offer': offer.to_dict()}), 200


@app.route('/api/transactions/<transaction_id>/confirm-received', methods=['POST'])
@jwt_required()
def confirm_received(transaction_id):
    buyer_id = get_jwt_identity()
    transaction = Transaction.query.get(transaction_id)
    if not transaction:
        return jsonify({'error': 'Transaction not found'}), 404
    if transaction.buyer_id != buyer_id:
        return jsonify({'error': 'Unauthorized'}), 403
    if transaction.status != 'escrow_held':
        return jsonify({'error': 'Transaction not in escrow'}), 400
    
    transaction.status = 'completed'
    transaction.buyer_confirmed_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Transaction completed', 'transaction': transaction.to_dict()}), 200


@app.route('/api/offers/<offer_id>/reject', methods=['POST'])
@jwt_required()
def reject_offer(offer_id):
    seller_id = get_jwt_identity()
    offer = Offer.query.get(offer_id)
    if not offer:
        return jsonify({'error': 'Offer not found'}), 404
    if offer.listing.seller_id != seller_id:
        return jsonify({'error': 'Unauthorized'}), 403
    offer.status = 'rejected'
    db.session.commit()
    return jsonify({'message': 'Offer rejected'}), 200


@app.route('/api/offers/received', methods=['GET'])
@jwt_required()
def get_received_offers():
    seller_id = get_jwt_identity()
    my_listings = Listing.query.filter_by(seller_id=seller_id).all()
    listing_ids = [l.id for l in my_listings]
    offers = Offer.query.filter(Offer.listing_id.in_(listing_ids)).order_by(Offer.created_at.desc()).all()
    result = []
    for offer in offers:
        data = offer.to_dict()
        data['listing'] = offer.listing.to_dict()
        result.append(data)
    return jsonify({'offers': result}), 200


@app.route('/api/transactions/mine', methods=['GET'])
@jwt_required()
def get_my_transactions():
    user_id = get_jwt_identity()
    purchases = Transaction.query.filter_by(buyer_id=user_id).order_by(Transaction.created_at.desc()).all()
    sales = Transaction.query.filter_by(seller_id=user_id).order_by(Transaction.created_at.desc()).all()

    def enrich(txn):
        data = txn.to_dict()
        listing = Listing.query.get(txn.listing_id)
        data['listing'] = listing.to_dict() if listing else None
        return data

    return jsonify({
        'purchases': [enrich(t) for t in purchases],
        'sales': [enrich(t) for t in sales],
    }), 200


@app.route('/api/payments/config', methods=['GET'])
def payment_config():
    return jsonify({'publishable_key': os.getenv('STRIPE_PUBLIC_KEY', '')}), 200


@app.route('/api/payments/create-intent', methods=['POST'])
@jwt_required()
def create_payment_intent():
    buyer_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get('listing_id') or not data.get('amount'):
        return jsonify({'error': 'Missing listing or amount'}), 400
    
    listing = Listing.query.get(data['listing_id'])
    if not listing:
        return jsonify({'error': 'Listing not found'}), 404
    
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(data['amount'] * 100),
            currency='usd',
            metadata={'listing_id': listing.id, 'buyer_id': buyer_id}
        )
        return jsonify({'client_secret': intent.client_secret, 'payment_intent_id': intent.id}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/payments/confirm', methods=['POST'])
@jwt_required()
def confirm_payment():
    buyer_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get('listing_id') or not data.get('payment_intent_id'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    listing = Listing.query.get(data['listing_id'])
    if not listing:
        return jsonify({'error': 'Listing not found'}), 404

    # Verify with Stripe that the payment actually succeeded before recording anything.
    try:
        intent = stripe.PaymentIntent.retrieve(data['payment_intent_id'])
    except Exception as e:
        return jsonify({'error': 'Could not verify payment: ' + str(e)}), 400

    if intent.status != 'succeeded':
        return jsonify({'error': 'Payment not completed'}), 400

    # Guard against double-recording the same charge.
    existing = Transaction.query.filter_by(stripe_payment_intent=data['payment_intent_id']).first()
    if existing:
        return jsonify({'message': 'Already recorded', 'transaction': existing.to_dict()}), 200

    try:
        transaction = Transaction(
            listing_id=listing.id,
            seller_id=listing.seller_id,
            buyer_id=buyer_id,
            amount=intent.amount / 100.0,
            stripe_payment_intent=data['payment_intent_id'],
            status='escrow_held',
            escrow_held_at=datetime.utcnow()
        )
        db.session.add(transaction)
        listing.status = 'sold'
        db.session.commit()
        return jsonify({'message': 'Payment confirmed', 'transaction': transaction.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
