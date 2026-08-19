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
    allow_trades = db.Column(db.Boolean, default=False)
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
            'allow_trades': self.allow_trades,
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
    transferred_at = db.Column(db.DateTime)
    transfer_deadline = db.Column(db.DateTime)
    confirm_deadline = db.Column(db.DateTime)
    buyer_confirmed_at = db.Column(db.DateTime)
    cancelled_at = db.Column(db.DateTime)
    auto_released = db.Column(db.Boolean, default=False)
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
            'transferred_at': self.transferred_at.isoformat() if self.transferred_at else None,
            'transfer_deadline': self.transfer_deadline.isoformat() if self.transfer_deadline else None,
            'confirm_deadline': self.confirm_deadline.isoformat() if self.confirm_deadline else None,
            'buyer_confirmed_at': self.buyer_confirmed_at.isoformat() if self.buyer_confirmed_at else None,
            'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None,
            'auto_released': self.auto_released,
            'reviewed': Review.query.filter_by(transaction_id=self.id).first() is not None,
        }


class Review(db.Model):
    __tablename__ = 'reviews'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = db.Column(db.String(36), db.ForeignKey('transactions.id'), nullable=False, unique=True)
    reviewer_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    reviewee_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        reviewer = User.query.get(self.reviewer_id)
        return {
            'id': self.id,
            'transaction_id': self.transaction_id,
            'reviewer_id': self.reviewer_id,
            'reviewer_username': reviewer.username if reviewer else 'Unknown',
            'reviewee_id': self.reviewee_id,
            'rating': self.rating,
            'comment': self.comment,
            'created_at': self.created_at.isoformat(),
        }


class TradeOffer(db.Model):
    __tablename__ = 'trade_offers'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # The listing the proposer wants (target) and the listing they offer (offered).
    target_listing_id = db.Column(db.String(36), db.ForeignKey('listings.id'), nullable=False, index=True)
    offered_listing_id = db.Column(db.String(36), db.ForeignKey('listings.id'), nullable=False)
    proposer_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    target_owner_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    status = db.Column(db.String(20), default='pending')  # pending | accepted | rejected | withdrawn
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        target = Listing.query.get(self.target_listing_id)
        offered = Listing.query.get(self.offered_listing_id)
        proposer = User.query.get(self.proposer_id)
        return {
            'id': self.id,
            'target_listing': target.to_dict() if target else None,
            'offered_listing': offered.to_dict() if offered else None,
            'proposer': proposer.to_dict() if proposer else None,
            'proposer_id': self.proposer_id,
            'target_owner_id': self.target_owner_id,
            'status': self.status,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
        }


class TradeSwap(db.Model):
    __tablename__ = 'trade_swaps'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trade_offer_id = db.Column(db.String(36), db.ForeignKey('trade_offers.id'))
    # The two parties and their respective listings being swapped.
    user_a_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    listing_a_id = db.Column(db.String(36), db.ForeignKey('listings.id'), nullable=False)
    user_b_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    listing_b_id = db.Column(db.String(36), db.ForeignKey('listings.id'), nullable=False)
    # Mirrored escrow: each side marks transferred + confirmed independently.
    a_transferred = db.Column(db.Boolean, default=False)
    b_transferred = db.Column(db.Boolean, default=False)
    a_confirmed = db.Column(db.Boolean, default=False)  # A confirms receiving B's ticket
    b_confirmed = db.Column(db.Boolean, default=False)  # B confirms receiving A's ticket
    status = db.Column(db.String(20), default='in_progress')  # in_progress | completed | cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    def to_dict(self, viewer_id=None):
        la = Listing.query.get(self.listing_a_id)
        lb = Listing.query.get(self.listing_b_id)
        ua = User.query.get(self.user_a_id)
        ub = User.query.get(self.user_b_id)
        data = {
            'id': self.id,
            'user_a': ua.to_dict() if ua else None,
            'user_b': ub.to_dict() if ub else None,
            'listing_a': la.to_dict() if la else None,
            'listing_b': lb.to_dict() if lb else None,
            'a_transferred': self.a_transferred,
            'b_transferred': self.b_transferred,
            'a_confirmed': self.a_confirmed,
            'b_confirmed': self.b_confirmed,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
        }
        # Add a "you" perspective so the frontend can render the right buttons.
        if viewer_id == self.user_a_id:
            data['you'] = {'role': 'a', 'your_listing': data['listing_a'], 'their_listing': data['listing_b'],
                           'you_transferred': self.a_transferred, 'you_confirmed': self.a_confirmed,
                           'they_transferred': self.b_transferred, 'they_confirmed': self.b_confirmed,
                           'other_user': data['user_b']}
        elif viewer_id == self.user_b_id:
            data['you'] = {'role': 'b', 'your_listing': data['listing_b'], 'their_listing': data['listing_a'],
                           'you_transferred': self.b_transferred, 'you_confirmed': self.b_confirmed,
                           'they_transferred': self.a_transferred, 'they_confirmed': self.a_confirmed,
                           'other_user': data['user_a']}
        return data


# ==================== ESCROW DEADLINE HELPERS ====================

TRANSFER_WINDOW_HOURS = 24   # seller has this long to transfer after purchase
CONFIRM_WINDOW_HOURS = 24    # buyer has this long to confirm after transfer


def _showtime_for(transaction):
    """Best-effort datetime of the show for this transaction's listing, or None."""
    listing = Listing.query.get(transaction.listing_id)
    if not listing or not listing.show_date:
        return None
    try:
        # show_date is stored as 'YYYY-MM-DD'; treat showtime as end of that day
        d = datetime.strptime(listing.show_date, '%Y-%m-%d')
        return d.replace(hour=23, minute=59, second=59)
    except (ValueError, TypeError):
        return None


def _deadline_from(start, window_hours, transaction):
    """A deadline `window_hours` after `start`, but never later than showtime.
    If it's already within the window of showtime, the deadline is showtime itself."""
    normal = start + timedelta(hours=window_hours)
    showtime = _showtime_for(transaction)
    deadline = normal
    if showtime and normal > showtime:
        deadline = showtime
    # Never hand back an already-expired (or effectively-zero) deadline: always
    # give at least a minimum window from "start", even for same-day/late shows.
    minimum = start + timedelta(hours=1)
    if deadline < minimum:
        deadline = minimum
    return deadline


def enforce_deadlines(transaction):
    """Lazy deadline enforcement: called whenever a transaction is loaded.
    - If seller missed the transfer deadline, the transaction is left in
      awaiting_transfer but the buyer will see a cancel/refund option (handled in UI/route).
    - If the buyer missed the confirm deadline after a transfer, auto-release to seller.
    Returns True if it changed state (caller should commit)."""
    now = datetime.utcnow()
    changed = False
    if transaction.status == 'transferred' and transaction.confirm_deadline and now > transaction.confirm_deadline:
        transaction.status = 'completed'
        transaction.buyer_confirmed_at = now
        transaction.completed_at = now
        transaction.auto_released = True
        changed = True
    return changed


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
    
    listing = Listing(seller_id=user_id, title=data['title'], description=data.get('description', ''), category=data.get('category', 'Phish'), condition=data.get('condition', 'good'), original_purchase_price=data['original_purchase_price'], asking_price=data['asking_price'], accepts_offers=data.get('accepts_offers', True), allow_trades=data.get('allow_trades', False), seller_covers_fees=data.get('seller_covers_fees', True), show_id=data.get('show_id'), show_date=data.get('show_date'))
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
    # Buyer can confirm receipt only after the seller has marked the ticket transferred.
    if transaction.status != 'transferred':
        return jsonify({'error': 'Ticket has not been marked as transferred yet'}), 400

    now = datetime.utcnow()
    transaction.status = 'completed'
    transaction.buyer_confirmed_at = now
    transaction.completed_at = now
    db.session.commit()
    return jsonify({'message': 'Transaction completed', 'transaction': transaction.to_dict()}), 200


@app.route('/api/transactions/<transaction_id>/mark-transferred', methods=['POST'])
@jwt_required()
def mark_transferred(transaction_id):
    seller_id = get_jwt_identity()
    transaction = Transaction.query.get(transaction_id)
    if not transaction:
        return jsonify({'error': 'Transaction not found'}), 404
    if transaction.seller_id != seller_id:
        return jsonify({'error': 'Only the seller can mark the ticket transferred'}), 403
    if transaction.status != 'awaiting_transfer':
        return jsonify({'error': 'Transaction is not awaiting transfer'}), 400

    now = datetime.utcnow()
    transaction.status = 'transferred'
    transaction.transferred_at = now
    transaction.confirm_deadline = _deadline_from(now, CONFIRM_WINDOW_HOURS, transaction)
    db.session.commit()
    return jsonify({'message': 'Marked as transferred', 'transaction': transaction.to_dict()}), 200


@app.route('/api/transactions/<transaction_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_transaction(transaction_id):
    buyer_id = get_jwt_identity()
    transaction = Transaction.query.get(transaction_id)
    if not transaction:
        return jsonify({'error': 'Transaction not found'}), 404
    if transaction.buyer_id != buyer_id:
        return jsonify({'error': 'Only the buyer can cancel'}), 403
    if transaction.status != 'awaiting_transfer':
        return jsonify({'error': 'This purchase can no longer be cancelled'}), 400
    # Only allowed once the seller has missed the transfer deadline.
    now = datetime.utcnow()
    if not transaction.transfer_deadline or now <= transaction.transfer_deadline:
        return jsonify({'error': 'The seller still has time to transfer the ticket'}), 400

    # Refund the buyer via Stripe.
    try:
        stripe.Refund.create(payment_intent=transaction.stripe_payment_intent)
    except Exception as e:
        return jsonify({'error': 'Refund failed: ' + str(e)}), 400

    transaction.status = 'cancelled'
    transaction.cancelled_at = now
    # Put the listing back on the market.
    listing = Listing.query.get(transaction.listing_id)
    if listing:
        listing.status = 'active'
    db.session.commit()
    return jsonify({'message': 'Purchase cancelled and refunded', 'transaction': transaction.to_dict()}), 200


@app.route('/api/reviews', methods=['POST'])
@jwt_required()
def create_review():
    reviewer_id = get_jwt_identity()
    data = request.get_json()
    transaction_id = data.get('transaction_id')
    rating = data.get('rating')

    if not transaction_id or rating is None:
        return jsonify({'error': 'Missing transaction or rating'}), 400
    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return jsonify({'error': 'Rating must be a number'}), 400
    if rating < 1 or rating > 5:
        return jsonify({'error': 'Rating must be between 1 and 5'}), 400

    transaction = Transaction.query.get(transaction_id)
    if not transaction:
        return jsonify({'error': 'Transaction not found'}), 404
    # Only the buyer on a completed transaction can review, and only the seller.
    if transaction.buyer_id != reviewer_id:
        return jsonify({'error': 'Only the buyer can leave a review'}), 403
    if transaction.status != 'completed':
        return jsonify({'error': 'You can only review completed transactions'}), 400
    if Review.query.filter_by(transaction_id=transaction_id).first():
        return jsonify({'error': 'You already reviewed this transaction'}), 400

    review = Review(
        transaction_id=transaction_id,
        reviewer_id=reviewer_id,
        reviewee_id=transaction.seller_id,
        rating=rating,
        comment=data.get('comment', ''),
    )
    db.session.add(review)
    db.session.flush()  # ensure this review is counted in the query below

    # Recalculate the seller's average rating and review count from all their reviews.
    seller = User.query.get(transaction.seller_id)
    all_ratings = [r.rating for r in Review.query.filter_by(reviewee_id=seller.id).all()]
    seller.total_reviews = len(all_ratings)
    seller.rating = round(sum(all_ratings) / len(all_ratings), 2) if all_ratings else 0.0

    db.session.commit()
    return jsonify({'message': 'Review submitted', 'review': review.to_dict()}), 201


@app.route('/api/users/<user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict()), 200


@app.route('/api/trades', methods=['POST'])
@jwt_required()
def propose_trade():
    proposer_id = get_jwt_identity()
    data = request.get_json()
    target_id = data.get('target_listing_id')
    offered_id = data.get('offered_listing_id')
    if not target_id or not offered_id:
        return jsonify({'error': 'Missing target or offered listing'}), 400

    target = Listing.query.get(target_id)
    offered = Listing.query.get(offered_id)
    if not target or not offered:
        return jsonify({'error': 'Listing not found'}), 404
    if target.status != 'active':
        return jsonify({'error': 'That listing is no longer available'}), 400
    if offered.status != 'active':
        return jsonify({'error': 'Your offered listing is not active'}), 400
    if not target.allow_trades:
        return jsonify({'error': 'That listing is not open to trades'}), 400
    if offered.seller_id != proposer_id:
        return jsonify({'error': 'You can only offer your own listing'}), 403
    if target.seller_id == proposer_id:
        return jsonify({'error': 'You cannot trade with yourself'}), 400
    # Prevent duplicate pending offers for the same pair.
    dupe = TradeOffer.query.filter_by(target_listing_id=target_id, offered_listing_id=offered_id, proposer_id=proposer_id, status='pending').first()
    if dupe:
        return jsonify({'error': 'You already have a pending offer for this trade'}), 400

    offer = TradeOffer(
        target_listing_id=target_id,
        offered_listing_id=offered_id,
        proposer_id=proposer_id,
        target_owner_id=target.seller_id,
        message=data.get('message', ''),
    )
    db.session.add(offer)
    db.session.commit()
    return jsonify(offer.to_dict()), 201


@app.route('/api/trades/mine', methods=['GET'])
@jwt_required()
def my_trade_offers():
    user_id = get_jwt_identity()
    incoming = TradeOffer.query.filter_by(target_owner_id=user_id, status='pending').order_by(TradeOffer.created_at.desc()).all()
    outgoing = TradeOffer.query.filter_by(proposer_id=user_id, status='pending').order_by(TradeOffer.created_at.desc()).all()
    return jsonify({
        'incoming': [o.to_dict() for o in incoming],
        'outgoing': [o.to_dict() for o in outgoing],
    }), 200


@app.route('/api/trades/<offer_id>/accept', methods=['POST'])
@jwt_required()
def accept_trade(offer_id):
    user_id = get_jwt_identity()
    offer = TradeOffer.query.get(offer_id)
    if not offer:
        return jsonify({'error': 'Trade offer not found'}), 404
    if offer.target_owner_id != user_id:
        return jsonify({'error': 'Only the owner of the requested ticket can accept'}), 403
    if offer.status != 'pending':
        return jsonify({'error': 'This offer is no longer pending'}), 400

    target = Listing.query.get(offer.target_listing_id)
    offered = Listing.query.get(offer.offered_listing_id)
    if not target or not offered or target.status != 'active' or offered.status != 'active':
        return jsonify({'error': 'One of the listings is no longer available'}), 400

    # Accept this offer; create the swap.
    offer.status = 'accepted'
    swap = TradeSwap(
        trade_offer_id=offer.id,
        user_a_id=offer.target_owner_id, listing_a_id=offer.target_listing_id,
        user_b_id=offer.proposer_id, listing_b_id=offer.offered_listing_id,
    )
    db.session.add(swap)

    # Take both listings off the market.
    target.status = 'in_trade'
    offered.status = 'in_trade'

    # Auto-reject any other pending offers that involve either listing.
    others = TradeOffer.query.filter(
        TradeOffer.status == 'pending',
        db.or_(
            TradeOffer.target_listing_id.in_([target.id, offered.id]),
            TradeOffer.offered_listing_id.in_([target.id, offered.id]),
        ),
    ).all()
    for o in others:
        o.status = 'rejected'

    db.session.commit()
    return jsonify({'message': 'Trade accepted', 'swap': swap.to_dict(viewer_id=user_id)}), 200


@app.route('/api/trades/<offer_id>/reject', methods=['POST'])
@jwt_required()
def reject_trade(offer_id):
    user_id = get_jwt_identity()
    offer = TradeOffer.query.get(offer_id)
    if not offer:
        return jsonify({'error': 'Trade offer not found'}), 404
    # Either the target owner can reject, or the proposer can withdraw.
    if user_id not in (offer.target_owner_id, offer.proposer_id):
        return jsonify({'error': 'Not authorized'}), 403
    if offer.status != 'pending':
        return jsonify({'error': 'This offer is no longer pending'}), 400
    offer.status = 'withdrawn' if user_id == offer.proposer_id else 'rejected'
    db.session.commit()
    return jsonify({'message': 'Trade offer ' + offer.status}), 200


def _finalize_swap_if_done(swap):
    """If both sides transferred and both confirmed, complete the swap."""
    if swap.a_transferred and swap.b_transferred and swap.a_confirmed and swap.b_confirmed and swap.status == 'in_progress':
        swap.status = 'completed'
        swap.completed_at = datetime.utcnow()
        la = Listing.query.get(swap.listing_a_id)
        lb = Listing.query.get(swap.listing_b_id)
        if la: la.status = 'traded'
        if lb: lb.status = 'traded'
        return True
    return False


@app.route('/api/swaps/mine', methods=['GET'])
@jwt_required()
def my_swaps():
    user_id = get_jwt_identity()
    swaps = TradeSwap.query.filter(
        db.or_(TradeSwap.user_a_id == user_id, TradeSwap.user_b_id == user_id)
    ).order_by(TradeSwap.created_at.desc()).all()
    return jsonify({'swaps': [sw.to_dict(viewer_id=user_id) for sw in swaps]}), 200


@app.route('/api/swaps/<swap_id>/mark-transferred', methods=['POST'])
@jwt_required()
def swap_mark_transferred(swap_id):
    user_id = get_jwt_identity()
    swap = TradeSwap.query.get(swap_id)
    if not swap:
        return jsonify({'error': 'Swap not found'}), 404
    if swap.status != 'in_progress':
        return jsonify({'error': 'This swap is not in progress'}), 400
    if user_id == swap.user_a_id:
        swap.a_transferred = True
    elif user_id == swap.user_b_id:
        swap.b_transferred = True
    else:
        return jsonify({'error': 'Not part of this swap'}), 403
    _finalize_swap_if_done(swap)
    db.session.commit()
    return jsonify({'message': 'Marked transferred', 'swap': swap.to_dict(viewer_id=user_id)}), 200


@app.route('/api/swaps/<swap_id>/confirm-received', methods=['POST'])
@jwt_required()
def swap_confirm_received(swap_id):
    user_id = get_jwt_identity()
    swap = TradeSwap.query.get(swap_id)
    if not swap:
        return jsonify({'error': 'Swap not found'}), 404
    if swap.status != 'in_progress':
        return jsonify({'error': 'This swap is not in progress'}), 400
    # You can only confirm receipt after the OTHER side has transferred.
    if user_id == swap.user_a_id:
        if not swap.b_transferred:
            return jsonify({'error': 'The other person has not transferred their ticket yet'}), 400
        swap.a_confirmed = True
    elif user_id == swap.user_b_id:
        if not swap.a_transferred:
            return jsonify({'error': 'The other person has not transferred their ticket yet'}), 400
        swap.b_confirmed = True
    else:
        return jsonify({'error': 'Not part of this swap'}), 403
    _finalize_swap_if_done(swap)
    db.session.commit()
    return jsonify({'message': 'Receipt confirmed', 'swap': swap.to_dict(viewer_id=user_id)}), 200


@app.route('/api/users/<user_id>/reviews', methods=['GET'])
def get_user_reviews(user_id):
    reviews = Review.query.filter_by(reviewee_id=user_id).order_by(Review.created_at.desc()).all()
    return jsonify({'reviews': [r.to_dict() for r in reviews]}), 200


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

    # Lazy deadline enforcement: auto-release any transfers the buyer never confirmed in time.
    dirty = False
    for txn in list(purchases) + list(sales):
        if enforce_deadlines(txn):
            dirty = True
    if dirty:
        db.session.commit()

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
        now = datetime.utcnow()
        transaction = Transaction(
            listing_id=listing.id,
            seller_id=listing.seller_id,
            buyer_id=buyer_id,
            amount=intent.amount / 100.0,
            stripe_payment_intent=data['payment_intent_id'],
            status='awaiting_transfer',
            escrow_held_at=now,
        )
        transaction.transfer_deadline = _deadline_from(now, TRANSFER_WINDOW_HOURS, transaction)
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
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, port=5000)
