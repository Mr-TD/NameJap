from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date

db = SQLAlchemy()


class DailyLog(db.Model):
    """Model representing a single day's count entry."""

    __tablename__ = "daily_logs"

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, unique=True, nullable=False, default=date.today)
    count = db.Column(db.Integer, nullable=False, default=0)
    notes = db.Column(db.String(500), nullable=True, default="")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def to_dict(self):
        """Serialize the log entry to a dictionary."""
        return {
            "id": self.id,
            "date": self.date.isoformat(),
            "count": self.count,
            "notes": self.notes or "",
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f"<DailyLog {self.date} count={self.count}>"
