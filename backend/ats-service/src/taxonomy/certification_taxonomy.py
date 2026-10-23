"""
Known professional certification patterns.
Each entry: (substring_to_search_for, canonical_display_name)
All pattern strings are lowercase.
"""

CERTIFICATION_PATTERNS: list[tuple[str, str]] = [

    # ── AWS ───────────────────────────────────────────────────────────────
    ("aws certified solutions architect",     "AWS Certified Solutions Architect"),
    ("aws solutions architect",               "AWS Certified Solutions Architect"),
    ("aws certified developer",               "AWS Certified Developer"),
    ("aws certified sysops",                  "AWS Certified SysOps Administrator"),
    ("aws certified devops",                  "AWS Certified DevOps Engineer"),
    ("aws certified cloud practitioner",      "AWS Cloud Practitioner"),
    ("aws cloud practitioner",                "AWS Cloud Practitioner"),
    ("aws certified data analytics",          "AWS Certified Data Analytics"),
    ("aws certified security",                "AWS Certified Security Specialty"),
    ("aws certified machine learning",        "AWS Certified Machine Learning Specialty"),
    ("aws certified advanced networking",     "AWS Advanced Networking Specialty"),

    # ── Google Cloud ─────────────────────────────────────────────────────
    ("google professional cloud architect",   "Google Professional Cloud Architect"),
    ("google associate cloud engineer",       "Google Associate Cloud Engineer"),
    ("google cloud data engineer",            "Google Professional Data Engineer"),
    ("google cloud developer",                "Google Professional Cloud Developer"),
    ("gcp associate",                         "Google Associate Cloud Engineer"),
    ("google cloud certified",                "Google Cloud Certified"),

    # ── Azure ─────────────────────────────────────────────────────────────
    ("azure fundamentals",                    "Azure Fundamentals (AZ-900)"),
    ("az-900",                                "Azure Fundamentals (AZ-900)"),
    ("az-104",                                "Azure Administrator (AZ-104)"),
    ("azure administrator",                   "Azure Administrator (AZ-104)"),
    ("az-204",                                "Azure Developer (AZ-204)"),
    ("azure developer",                       "Azure Developer (AZ-204)"),
    ("az-305",                                "Azure Solutions Architect (AZ-305)"),
    ("azure solutions architect",             "Azure Solutions Architect (AZ-305)"),
    ("az-400",                                "Azure DevOps Engineer (AZ-400)"),
    ("azure devops engineer",                 "Azure DevOps Engineer (AZ-400)"),

    # ── CompTIA ───────────────────────────────────────────────────────────
    ("comptia a+",                            "CompTIA A+"),
    ("comptia network+",                      "CompTIA Network+"),
    ("comptia security+",                     "CompTIA Security+"),
    ("comptia casp+",                         "CompTIA CASP+"),
    ("comptia cloud+",                        "CompTIA Cloud+"),
    ("comptia cysa+",                         "CompTIA CySA+"),
    ("comptia pentest+",                      "CompTIA PenTest+"),
    ("comptia linux+",                        "CompTIA Linux+"),

    # ── Cisco ─────────────────────────────────────────────────────────────
    ("ccna",                                  "Cisco CCNA"),
    ("ccnp",                                  "Cisco CCNP"),
    ("ccie",                                  "Cisco CCIE"),

    # ── Kubernetes ───────────────────────────────────────────────────────
    ("certified kubernetes administrator",    "CKA – Certified Kubernetes Administrator"),
    ("cka",                                   "CKA – Certified Kubernetes Administrator"),
    ("certified kubernetes application",      "CKAD – Certified Kubernetes Application Developer"),
    ("ckad",                                  "CKAD – Certified Kubernetes Application Developer"),
    ("cks",                                   "CKS – Certified Kubernetes Security Specialist"),

    # ── Project Management ────────────────────────────────────────────────
    ("pmp",                                   "PMP – Project Management Professional"),
    ("project management professional",       "PMP – Project Management Professional"),
    ("prince2",                               "PRINCE2"),
    ("pmi-acp",                               "PMI-ACP Agile Certified Practitioner"),

    # ── Scrum ─────────────────────────────────────────────────────────────
    ("certified scrum master",                "Certified ScrumMaster (CSM)"),
    ("csm",                                   "Certified ScrumMaster (CSM)"),
    ("certified scrum product owner",         "Certified Scrum Product Owner (CSPO)"),
    ("cspo",                                  "Certified Scrum Product Owner (CSPO)"),
    ("safe agilist",                          "SAFe Agilist"),

    # ── Security ─────────────────────────────────────────────────────────
    ("cissp",                                 "CISSP"),
    ("cism",                                  "CISM"),
    ("ceh",                                   "CEH – Certified Ethical Hacker"),
    ("certified ethical hacker",              "CEH – Certified Ethical Hacker"),
    ("oscp",                                  "OSCP"),

    # ── Oracle ───────────────────────────────────────────────────────────
    ("oracle certified professional",         "Oracle Certified Professional"),
    ("oracle certified associate",            "Oracle Certified Associate"),
    ("ocp",                                   "Oracle Certified Professional"),
    ("oca",                                   "Oracle Certified Associate"),

    # ── Microsoft ─────────────────────────────────────────────────────────
    ("microsoft certified",                   "Microsoft Certified"),
    ("mcsa",                                  "MCSA"),
    ("mcse",                                  "MCSE"),

    # ── Data / ML ─────────────────────────────────────────────────────────
    ("tensorflow developer certificate",      "TensorFlow Developer Certificate"),
    ("databricks certified",                  "Databricks Certified"),

    # ── Salesforce ───────────────────────────────────────────────────────
    ("salesforce certified",                  "Salesforce Certified"),
    ("salesforce administrator",              "Salesforce Certified Administrator"),
    ("salesforce developer",                  "Salesforce Certified Developer"),

    # ── HashiCorp ─────────────────────────────────────────────────────────
    ("hashicorp certified terraform",         "HashiCorp Certified: Terraform Associate"),
    ("terraform associate",                   "HashiCorp Certified: Terraform Associate"),

    # ── Linux ─────────────────────────────────────────────────────────────
    ("rhcsa",                                 "RHCSA – Red Hat Certified System Administrator"),
    ("rhce",                                  "RHCE – Red Hat Certified Engineer"),
    ("lpic",                                  "LPIC Linux Professional"),

    # ── Misc ─────────────────────────────────────────────────────────────
    ("itil",                                  "ITIL Certification"),
    ("six sigma",                             "Six Sigma"),
    ("lean six sigma",                        "Lean Six Sigma"),
    ("google analytics",                      "Google Analytics Certification"),
]