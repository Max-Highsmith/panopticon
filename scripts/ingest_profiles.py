#!/usr/bin/env python3
"""
Panopticon — Synthetic Profiles Ingestion Script

Generates entirely fictional person-of-interest profiles for safety testing.
All names, locations, biographies, and intelligence assessments are synthetic.
No real persons are represented.

Usage:
    python3 scripts/ingest_profiles.py

Output:
    data/layers/points/profiles.json

This script is self-contained — no external data source is required since the
profiles are synthetic test data. The script serves as the reproducible generator
for the dataset and single source of truth for the profile schema.

To add or modify profiles, edit the PROFILES list below and re-run.
"""

import json
import os
from datetime import date

OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), '..', 'data', 'layers', 'ambient', 'profiles.json'
)

SOURCE_META = {
    "_source": {
        "description": "Synthetic person-of-interest profiles for safety testing",
        "origin": "Entirely fictional — generated as test data for application safety testing. No real persons represented.",
        "retrieved": date.today().isoformat(),
        "license": "Synthetic test data — no licensing constraints",
        "notes": (
            "All names, locations, biographies, and intelligence assessments are entirely fictional. "
            "Any resemblance to real persons is coincidental. Profile images are placeholder references — "
            "place generated/synthetic face images in assets/profiles/."
        ),
    }
}

# fmt: off
PROFILES = [
    # --- LOCATED (will render on globe) ---
    {
        "name": "Viktor Petrov", "age": 47, "nationality": "Russian",
        "lat": 55.7558, "lon": 37.6173, "location_label": "Moscow, Russia",
        "image": "assets/profiles/person_01.png",
        "threat_level": "HIGH", "status": "active",
        "aliases": ["Volk", "Grey Fox"],
        "associations": ["Ural Industrial Group", "Nordic Shell Corp"],
        "dossier": (
            "Subject identified as intermediary in dual-use technology procurement network. "
            "Operates through shell companies registered in Cyprus and UAE. Background in military "
            "signals intelligence (2000-2010). Known to frequent trade exhibitions in Abu Dhabi and "
            "Singapore. Surveillance indicates regular encrypted communications with contacts in three "
            "countries. Financial records show unexplained transfers through Baltic banking corridors. "
            "No outstanding warrants. Approach with caution — counter-surveillance trained."
        ),
    },
    {
        "name": "Chen Wei", "age": 34, "nationality": "Chinese",
        "lat": 22.5431, "lon": 114.0579, "location_label": "Shenzhen, China",
        "image": "assets/profiles/person_02.png",
        "threat_level": "MODERATE", "status": "active",
        "aliases": ["David Chen"],
        "associations": ["Shenzhen Microelectronics Ltd", "Pacific Bridge Consulting"],
        "dossier": (
            "Subject works as technical liaison between semiconductor firms and state research "
            "institutes. Academic background in electrical engineering (Tsinghua, 2014). Holds patents "
            "in chip packaging technologies. Flagged after multiple visits to restricted-export "
            "technology conferences in Europe. No direct evidence of illicit activity — profile "
            "maintained for pattern analysis. Open-source footprint minimal since 2023."
        ),
    },
    {
        "name": "Amara Okafor", "age": 41, "nationality": "Nigerian",
        "lat": 6.5244, "lon": 3.3792, "location_label": "Lagos, Nigeria",
        "image": "assets/profiles/person_03.png",
        "threat_level": "ELEVATED", "status": "active",
        "aliases": ["A.O.", "The Accountant"],
        "associations": ["West African Trade Alliance", "Meridian Capital Partners"],
        "dossier": (
            "Subject is a qualified forensic accountant turned financial facilitator. Known to structure "
            "complex multi-jurisdictional transactions to obscure beneficial ownership. Has operated in "
            "Lagos, London, and Dubai. Intelligence suggests involvement in laundering proceeds from "
            "illegal mining operations in the Sahel region. Maintains legitimate consulting business as "
            "cover. Multiple bank accounts across four jurisdictions flagged by FinCEN equivalents."
        ),
    },
    {
        "name": "Elena Varga", "age": 29, "nationality": "Romanian",
        "lat": 44.4268, "lon": 26.1025, "location_label": "Bucharest, Romania",
        "image": "assets/profiles/person_04.png",
        "threat_level": "MODERATE", "status": "active",
        "aliases": ["Spectra"],
        "associations": ["Freelance", "Eastern European Cyber Collective (suspected)"],
        "dossier": (
            "Subject is a skilled penetration tester with legitimate cybersecurity certifications "
            "(OSCP, OSCE). Suspected moonlighting in grey-market vulnerability research and exploit "
            "brokerage. Active on invite-only forums under pseudonym. No criminal record. Academic "
            "background in computer science (Politehnica University, 2019). Fluent in Romanian, "
            "English, Russian. Believed to have declined multiple recruitment approaches from state "
            "and non-state actors."
        ),
    },
    {
        "name": "Raj Mehta", "age": 52, "nationality": "Indian",
        "lat": 19.076, "lon": 72.8777, "location_label": "Mumbai, India",
        "image": "assets/profiles/person_05.png",
        "threat_level": "LOW", "status": "active",
        "aliases": [],
        "associations": ["Mehta & Sons Import-Export", "Chamber of Commerce Mumbai"],
        "dossier": (
            "Subject runs a third-generation import-export business specializing in industrial "
            "machinery and chemical precursors. Profile maintained due to commodity types handled — no "
            "direct evidence of diversion. Has cooperated with customs authorities in past inquiries. "
            "Well-connected in Mumbai business community. Regularly travels to Southeast Asia and East "
            "Africa. Clean financial audit history through 2025."
        ),
    },
    {
        "name": "Fatima Al-Rashidi", "age": 38, "nationality": "Kuwaiti",
        "lat": 29.3759, "lon": 47.9774, "location_label": "Kuwait City, Kuwait",
        "image": "assets/profiles/person_06.png",
        "threat_level": "MODERATE", "status": "active",
        "aliases": ["F.R."],
        "associations": ["Gulf Horizon Investment Fund", "Al-Rashidi Family Office"],
        "dossier": (
            "Subject manages a family investment fund with holdings across real estate, hospitality, "
            "and commodities. Flagged after fund co-invested with entities on regional watchlists. No "
            "personal sanctions or restrictions. Educated in finance (LSE, 2010). Maintains residences "
            "in Kuwait, London, and Geneva. Social media presence suggests extensive political and "
            "business network across GCC states. Subject has not been directly implicated in any "
            "illicit activity."
        ),
    },
    {
        "name": "Diego Salazar", "age": 50, "nationality": "Colombian",
        "lat": 4.711, "lon": -74.0721, "location_label": "Bogota, Colombia",
        "image": "assets/profiles/person_07.png",
        "threat_level": "ELEVATED", "status": "active",
        "aliases": ["El Ingeniero"],
        "associations": ["Andean Logistics Corp", "Free Trade Zone Operators Association"],
        "dossier": (
            "Subject operates a logistics company specializing in containerized cargo across Latin "
            "American ports. Former civil engineer with Colombian navy contracts (2000-2008). "
            "Intelligence suggests company vehicles have been used to transport undeclared goods, "
            "though subject's personal involvement remains unconfirmed. Has legitimate government "
            "contracts for infrastructure projects. Known to employ former military personnel. "
            "Extensive network across Cartagena, Panama City, and Guayaquil port systems."
        ),
    },
    {
        "name": "Yuki Tanaka", "age": 33, "nationality": "Japanese",
        "lat": 35.6762, "lon": 139.6503, "location_label": "Tokyo, Japan",
        "image": "assets/profiles/person_08.png",
        "threat_level": "LOW", "status": "monitoring",
        "aliases": [],
        "associations": ["Tanaka Strategic Advisory", "Japan External Trade Organization"],
        "dossier": (
            "Subject is a corporate intelligence analyst specializing in competitive intelligence for "
            "Japanese manufacturing firms. Former JETRO researcher (2016-2021). Profile maintained as "
            "potential cooperative contact rather than threat. Has published open-source analysis on "
            "supply chain vulnerabilities in rare earth markets. Security clearance lapsed 2022. "
            "Attends major defense industry conferences as observer/analyst."
        ),
    },
    {
        "name": "Kwame Asante", "age": 44, "nationality": "Ghanaian",
        "lat": 5.6037, "lon": -0.187, "location_label": "Accra, Ghana",
        "image": "assets/profiles/person_09.png",
        "threat_level": "MODERATE", "status": "active",
        "aliases": ["K.A."],
        "associations": ["Ashanti Resource Holdings", "Pan-African Mining Consortium"],
        "dossier": (
            "Subject holds controlling interests in several artisanal and small-scale gold mining "
            "operations across Ghana and Burkina Faso. Some operations in disputed licensing areas. "
            "Subject has political connections to ruling party and regional chiefs. Environmental "
            "compliance records incomplete. Mercury usage at several sites exceeds regulatory limits. "
            "Subject travels frequently to Dubai (gold souk connections) and Johannesburg. Financial "
            "flows partially opaque — some revenue channeled through Lome-based intermediaries."
        ),
    },
    {
        "name": "Maria Fernandez", "age": 36, "nationality": "Brazilian",
        "lat": -23.5505, "lon": -46.6333, "location_label": "Sao Paulo, Brazil",
        "image": "assets/profiles/person_10.png",
        "threat_level": "LOW", "status": "monitoring",
        "aliases": [],
        "associations": ["Fernandez Trade Solutions", "Brazil-China Business Council"],
        "dossier": (
            "Subject is a trade compliance consultant advising Brazilian firms on export controls and "
            "sanctions compliance. Former federal police analyst (Departamento de Policia Federal, "
            "2014-2020). Profile maintained as industry contact. Has provided voluntary information on "
            "suspicious trade inquiries in the past. Considered reliable. Fluent in Portuguese, "
            "English, Mandarin. Regularly publishes in trade compliance journals."
        ),
    },
    {
        "name": "Aleksandr Volkov", "age": 55, "nationality": "Ukrainian",
        "lat": 46.4825, "lon": 30.7233, "location_label": "Odesa, Ukraine",
        "image": "assets/profiles/person_11.png",
        "threat_level": "HIGH", "status": "active",
        "aliases": ["Sasha", "The Captain"],
        "associations": ["Black Sea Maritime Services", "Odesa Port Authority (former)"],
        "dossier": (
            "Subject is a former merchant marine captain now operating a maritime services company in "
            "Odesa. Intelligence indicates company has facilitated sanctions evasion through ship-to-ship "
            "cargo transfers in international waters. Subject has connections to both Ukrainian oligarch "
            "networks and Russian business interests despite the conflict. Multiple vessels linked to his "
            "company have conducted AIS spoofing and flag-hopping. Subject is under investigation by "
            "multiple European maritime authorities. Considered flight risk."
        ),
    },
    {
        "name": "Priya Sharma", "age": 31, "nationality": "Indian",
        "lat": 28.6139, "lon": 77.209, "location_label": "New Delhi, India",
        "image": "assets/profiles/person_12.png",
        "threat_level": "LOW", "status": "monitoring",
        "aliases": [],
        "associations": ["Centre for Strategic Studies Delhi", "Ministry of External Affairs (former)"],
        "dossier": (
            "Subject is a policy researcher at a New Delhi think tank specializing in Indo-Pacific "
            "security dynamics. Former junior analyst at MEA (2019-2023). Published extensively on "
            "maritime security in Indian Ocean region. Profile maintained for open-source intelligence "
            "value — her publications often reflect emerging Indian foreign policy positions. No "
            "security concerns. Attended track-two dialogues in Singapore and Canberra."
        ),
    },
    {
        "name": "Omar Hassan", "age": 48, "nationality": "Egyptian",
        "lat": 30.0444, "lon": 31.2357, "location_label": "Cairo, Egypt",
        "image": "assets/profiles/person_13.png",
        "threat_level": "ELEVATED", "status": "active",
        "aliases": ["Abu Tarek"],
        "associations": ["Nile Delta Trading Co", "Cairo Chamber of Commerce"],
        "dossier": (
            "Subject is a commodities trader specializing in agricultural products and fertilizers. "
            "Flagged after shipments routed through his company were found to contain dual-use chemical "
            "precursors in secondary containers. Subject denied knowledge and cooperated with "
            "investigation — charges not pursued due to insufficient evidence. Continues to operate "
            "with enhanced monitoring. Business connections extend across North Africa, Turkey, and "
            "Jordan. Maintains relationship with Egyptian military procurement contacts."
        ),
    },
    {
        "name": "Lars Bergstrom", "age": 45, "nationality": "Swedish",
        "lat": 59.3293, "lon": 18.0686, "location_label": "Stockholm, Sweden",
        "image": "assets/profiles/person_14.png",
        "threat_level": "LOW", "status": "inactive",
        "aliases": [],
        "associations": ["Nordic Defense Research Institute (former)", "Bergstrom Consulting AB"],
        "dossier": (
            "Subject is a former defense researcher who transitioned to private consulting on Nordic "
            "security issues. Held SECRET-level clearance with Swedish MOD until 2021. Profile "
            "maintained post-clearance as routine. No derogatory information. Publishes occasional "
            "op-eds on Arctic security and Baltic defense cooperation. Considered a subject matter "
            "expert rather than a person of concern. Last activity review: clean."
        ),
    },

    # --- UNLOCATED (in data but won't render on globe) ---
    {
        "name": "James Whitfield", "age": 43, "nationality": "British",
        "lat": None, "lon": None, "location_label": "UNKNOWN",
        "image": "assets/profiles/person_15.png",
        "threat_level": "HIGH", "status": "missing",
        "aliases": ["Mr. Grey", "John Ashby"],
        "associations": ["HM Government (former)", "Aegis Maritime Security (former)"],
        "dossier": (
            "Subject is a former intelligence officer with extensive Middle East and Central Asia "
            "experience. Resigned from service in 2020 under undisclosed circumstances. Last confirmed "
            "sighting: Istanbul, October 2024. Believed to be operating as independent security "
            "consultant or broker. Multiple passports suspected. Subject has detailed knowledge of "
            "Western intelligence methods and networks. Considered a significant counterintelligence "
            "concern. All stations alerted. Approach authorized but not apprehension — diplomatic "
            "sensitivities apply."
        ),
    },
    {
        "name": "Kim Sun-hee", "age": 37, "nationality": "South Korean",
        "lat": None, "lon": None, "location_label": "UNKNOWN — last seen Seoul, 2025",
        "image": "assets/profiles/person_16.png",
        "threat_level": "MODERATE", "status": "missing",
        "aliases": ["Sunny Kim"],
        "associations": ["Samsung Advanced Institute of Technology (former)", "Korean Institute of Science and Technology"],
        "dossier": (
            "Subject is a materials scientist specializing in advanced semiconductor substrate "
            "research. Disappeared from her Seoul apartment in March 2025. No signs of foul play — "
            "personal effects and passport missing, suggesting voluntary departure. Employer reported "
            "theft of proprietary research data concurrent with disappearance. Subject had recent "
            "contact with foreign nationals at an academic conference in Taipei. South Korean NIS "
            "investigating. Profile flagged for any border crossing or financial activity."
        ),
    },
    {
        "name": "Ahmed bin Farhan", "age": 51, "nationality": "Saudi",
        "lat": None, "lon": None, "location_label": "UNKNOWN — last known Riyadh, 2024",
        "image": "assets/profiles/person_17.png",
        "threat_level": "ELEVATED", "status": "missing",
        "aliases": ["Abu Farhan"],
        "associations": ["Al-Farhan Holdings", "Riyadh Business Forum"],
        "dossier": (
            "Subject is a businessman with interests in construction and defense contracting across "
            "the Gulf region. Left Saudi Arabia in late 2024 amid reports of a commercial dispute with "
            "a politically connected rival. Current location unknown — unconfirmed reports place him "
            "in Turkey or East Africa. Financial assets partially frozen by Saudi authorities. Subject "
            "possesses significant knowledge of Gulf defense procurement processes. No charges filed. "
            "Monitoring for re-emergence in financial networks."
        ),
    },
    {
        "name": "Nadia Popov", "age": 28, "nationality": "Belarusian",
        "lat": None, "lon": None, "location_label": "CLASSIFIED",
        "image": "assets/profiles/person_18.png",
        "threat_level": "MODERATE", "status": "protected",
        "aliases": ["Nadya"],
        "associations": ["Belarusian State University (former)", "undisclosed Western agency"],
        "dossier": (
            "Subject is a former signals intelligence analyst who defected from Belarusian military "
            "intelligence in 2024. Currently under protection — location classified. Has provided "
            "actionable intelligence on electronic warfare capabilities and surveillance "
            "infrastructure. Debriefing ongoing. Subject expressed concerns about family members "
            "remaining in Belarus. Reliability assessment: HIGH. Access level for this file: "
            "RESTRICTED. Contact case officer for any queries."
        ),
    },
    {
        "name": "Thomas Richter", "age": 46, "nationality": "German",
        "lat": None, "lon": None, "location_label": "OFF-GRID",
        "image": "assets/profiles/person_19.png",
        "threat_level": "LOW", "status": "inactive",
        "aliases": ["T.R."],
        "associations": ["Bundesnachrichtendienst (former)", "Munich Security Conference (former staff)"],
        "dossier": (
            "Subject is a former German intelligence officer who retired from the BND in 2022 after "
            "18 years of service. Specialized in counterterrorism and HUMINT operations in North "
            "Africa. Post-retirement, subject has deliberately minimized digital footprint — no social "
            "media, no published address. Believed to be living in rural Bavaria. Profile maintained "
            "as routine post-service monitoring. No indications of compromise or unauthorized "
            "disclosures. Annual welfare check: last completed January 2026, no concerns."
        ),
    },
    {
        "name": "Ana Cristina Duarte", "age": 39, "nationality": "Portuguese",
        "lat": None, "lon": None, "location_label": "MOBILE — multiple recent sightings",
        "image": "assets/profiles/person_20.png",
        "threat_level": "LOW", "status": "active",
        "aliases": ["ACD", "Cristina"],
        "associations": ["Bellingcat (contributor)", "European Investigative Collaborations"],
        "dossier": (
            "Subject is an open-source intelligence researcher and investigative journalist. Publishes "
            "analysis on maritime sanctions evasion, illegal fishing, and environmental crimes using "
            "satellite imagery and AIS data. No security threat — profile maintained because her "
            "published work occasionally overlaps with classified investigations, raising concerns "
            "about potential source exposure. Travels frequently across Europe and West Africa. Has "
            "testified before European Parliament committees on maritime transparency. Considered a "
            "potential cooperative contact for OSINT collaboration."
        ),
    },
]
# fmt: on


def build_output():
    located = [p for p in PROFILES if p["lat"] is not None]
    unlocated = [p for p in PROFILES if p["lat"] is None]

    output = {**SOURCE_META, "located": located, "unlocated": unlocated}

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(located)} located + {len(unlocated)} unlocated profiles → {OUTPUT_PATH}")


if __name__ == "__main__":
    build_output()
