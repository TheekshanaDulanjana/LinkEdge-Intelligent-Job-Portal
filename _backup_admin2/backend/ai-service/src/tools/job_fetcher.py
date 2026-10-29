import os
import requests


def fetch_active_jobs() -> list:
    """
    Calls the job-service API and returns all active job listings.
    Returns an empty list if the service is unreachable.
    """
    job_service_url = os.getenv("JOB_SERVICE_URL", "http://localhost:3002")

    try:
        response = requests.get(
            f"{job_service_url}/api/v1/jobs",
            params={"limit": 50},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("data", {}).get("jobs", [])

    except requests.exceptions.ConnectionError:
        print("Warning: Cannot connect to job-service — returning empty list")
        return []
    except Exception as e:
        print(f"Warning: Job fetch failed — {e}")
        return []