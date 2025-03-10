from flask_sqlalchemy import SQLAlchemy
import uuid

db = SQLAlchemy()

class Job_Description(db.Model):
    __tablename__ = "job_description"
    job_des_id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_des = db.Column(db.Text, nullable=False)

    resumes = db.relationship('Resume', back_populates='job_description', cascade="all, delete")

    def to_dict(self):
        return {
            'job_des_id': self.job_des_id,
            'job_des': self.job_des,
            'resumes': [resume.to_dict() for resume in self.resumes]
        }

class Resume(db.Model):
    __tablename__ = "resume"
    resume_id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    file_path = db.Column(db.String, nullable=False)
    job_des_id = db.Column(db.String, db.ForeignKey('job_description.job_des_id'), nullable=False)

    job_description = db.relationship('Job_Description', back_populates='resumes')

    def to_dict(self):
        return {
            'resume_id': self.resume_id,
            'file_path': self.file_path,
            'job_des_id': self.job_des_id
        }
