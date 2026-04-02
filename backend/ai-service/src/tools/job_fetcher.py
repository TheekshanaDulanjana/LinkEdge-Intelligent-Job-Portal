import requests
import os


def fetch_active_jobs() -> list:
    """
    Fetches all active job listings from the job-service.
    Returns a list of job dictionaries.
    """
    job_service_url = os.getenv("JOB_SERVICE_URL", "http://localhost:3002")

    try:
        response = requests.get(
            f"{job_service_url}/api/v1/jobs",
            params={"limit": 50},  # Get up to 50 active jobs
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("data", {}).get("jobs", [])

    except requests.exceptions.ConnectionError:
        print("Warning: Could not connect to job-service")
        return []
    except Exception as e:
        print(f"Warning: Could not fetch jobs: {e}")
        return []