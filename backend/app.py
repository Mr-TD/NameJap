import os
from datetime import date, datetime, timedelta

from flask import Flask, jsonify, request
from flask_cors import CORS
from models import DailyLog, db

app = Flask(__name__)
CORS(app)

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(
    basedir, "namjap.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

# Create tables on first run
with app.app_context():
    db.create_all()


# ─── API Routes ───────────────────────────────────────────────────────────────


@app.route("/api/today", methods=["GET"])
def get_today():
    """Get or create today's log entry."""
    today = date.today()
    log = DailyLog.query.filter_by(date=today).first()
    if not log:
        log = DailyLog(date=today, count=0)
        db.session.add(log)
        db.session.commit()
    return jsonify(log.to_dict())


@app.route("/api/log", methods=["POST"])
def save_log():
    """Create or update today's count."""
    data = request.get_json()
    count = data.get("count", 0)
    notes = data.get("notes", "")
    log_date_str = data.get("date", None)

    if log_date_str:
        log_date = date.fromisoformat(log_date_str)
    else:
        log_date = date.today()

    log = DailyLog.query.filter_by(date=log_date).first()
    if log:
        log.count = count
        log.notes = notes
        log.updated_at = datetime.utcnow()
    else:
        log = DailyLog(date=log_date, count=count, notes=notes)
        db.session.add(log)

    db.session.commit()
    return jsonify(log.to_dict()), 200


@app.route("/api/logs", methods=["GET"])
def get_logs():
    """Get all log entries, newest first. Optional query params: start, end (ISO dates)."""
    query = DailyLog.query

    start = request.args.get("start")
    end = request.args.get("end")
    if start:
        query = query.filter(DailyLog.date >= date.fromisoformat(start))
    if end:
        query = query.filter(DailyLog.date <= date.fromisoformat(end))

    logs = query.order_by(DailyLog.date.desc()).all()
    return jsonify([log.to_dict() for log in logs])


@app.route("/api/log/<int:log_id>", methods=["PUT"])
def update_log(log_id):
    """Edit a specific log entry."""
    log = DailyLog.query.get_or_404(log_id)
    data = request.get_json()

    if "count" in data:
        log.count = data["count"]
    if "notes" in data:
        log.notes = data["notes"]

    log.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(log.to_dict())


@app.route("/api/log/<int:log_id>", methods=["DELETE"])
def delete_log(log_id):
    """Delete a log entry."""
    log = DailyLog.query.get_or_404(log_id)
    db.session.delete(log)
    db.session.commit()
    return jsonify({"message": "Deleted", "id": log_id})


@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Get aggregate statistics."""
    logs = DailyLog.query.order_by(DailyLog.date.desc()).all()

    if not logs:
        return jsonify(
            {
                "total": 0,
                "average": 0,
                "max_count": 0,
                "max_date": None,
                "days_logged": 0,
                "current_streak": 0,
            }
        )

    total = sum(l.count for l in logs)
    days_logged = len(logs)
    average = round(total / days_logged, 1) if days_logged > 0 else 0

    # Find the day with highest count
    max_log = max(logs, key=lambda l: l.count)

    # Calculate current streak (consecutive days ending today)
    today = date.today()
    streak = 0
    check_date = today
    log_dates = {l.date for l in logs}

    while check_date in log_dates:
        streak += 1
        check_date -= timedelta(days=1)

    return jsonify(
        {
            "total": total,
            "average": average,
            "max_count": max_log.count,
            "max_date": max_log.date.isoformat(),
            "days_logged": days_logged,
            "current_streak": streak,
        }
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
