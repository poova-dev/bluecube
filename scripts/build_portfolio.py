#!/usr/bin/env python3
"""
Master Portfolio Builder & Reconciler for Blue Cube Architects
Loads every project from BLUECUBE WEB PAGE TREE.pdf, builds normalized data registry,
generates individual project detail pages at /projects/[slug]/index.html,
generates category listing pages with full project rosters, and updates sitemap.xml.
"""

import os
import sys
import json
import re
from datetime import datetime

# Import project inventory
sys.path.insert(0, os.path.dirname(__file__))
import projects_registry_data as pdata

# Constants
CLOUD_NAME = "jvdlk3j0"
CDN_PREFIX = f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/f_auto,q_auto/bluecube"
BASE_URL = "https://www.bluecube.co.in"

# Load Cloudinary manifest
MANIFEST_FILE = "cloudinary_manifest.json"
c_manifest = {}
if os.path.exists(MANIFEST_FILE):
    with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
        c_manifest = json.load(f)

def get_cdn_url(rel_path):
    if not rel_path:
        return f"{CDN_PREFIX}/brand/cover_reference.jpg"
    if rel_path in c_manifest:
        return c_manifest[rel_path].get("cdn_url", f"{CDN_PREFIX}/{rel_path}")
    return f"{CDN_PREFIX}/{rel_path}"

# Combine all 140 projects
ALL_PROJECTS = (
    pdata.RESIDENTIAL_PROJECTS +
    pdata.COMMERCIAL_PROJECTS +
    pdata.CONTAINER_PROJECTS +
    pdata.INTERIOR_PROJECTS
)

# Pass 1: Assign CDN URLs
for p in ALL_PROJECTS:
    p["featured_image_url"] = get_cdn_url(p.get("image_file"))
    p["gallery_urls"] = [get_cdn_url(g) for g in p.get("gallery", [])]

# Pass 2: Compute related projects
for p in ALL_PROJECTS:
    same_subcat = [
        other for other in ALL_PROJECTS
        if other["id"] != p["id"] and other.get("subcategory") == p.get("subcategory")
    ]
    same_cat = [
        other for other in ALL_PROJECTS
        if other["id"] != p["id"] and other.get("category") == p.get("category") and other not in same_subcat
    ]
    candidates = (same_subcat + same_cat)[:3]
    if len(candidates) < 3:
        others = [other for other in ALL_PROJECTS if other["id"] != p["id"] and other not in candidates]
        candidates.extend(others[:(3 - len(candidates))])
    
    p["related_projects"] = [
        {
            "id": c["id"],
            "slug": c["slug"],
            "title": c["title"],
            "category": c["category"],
            "subcategory": c["subcategory"],
            "location": c["location"],
            "featured_image_url": c["featured_image_url"]
        }
        for c in candidates
    ]

print(f"Total projects compiled in registry: {len(ALL_PROJECTS)}")

# 1. Export Data Registries
os.makedirs("data", exist_ok=True)
os.makedirs("assets/data", exist_ok=True)
os.makedirs("assets/js", exist_ok=True)

with open("data/projects.json", "w", encoding="utf-8") as f:
    json.dump(ALL_PROJECTS, f, indent=2)

with open("assets/data/projects.json", "w", encoding="utf-8") as f:
    json.dump(ALL_PROJECTS, f, indent=2)

with open("assets/js/projects-data.js", "w", encoding="utf-8") as f:
    f.write(f"// Blue Cube Architects — Complete Portfolio Data Registry\n")
    f.write(f"// Generated {datetime.now().isoformat()}\n")
    f.write(f"window.BLUECUBE_PORTFOLIO = {json.dumps(ALL_PROJECTS, indent=2)};\n")

print("Saved data/projects.json, assets/data/projects.json, assets/js/projects-data.js")

# Reusable Navigation HTML (Relative path parameter)
def render_nav(depth=0):
    prefix = "../" * depth if depth > 0 else "./"
    return f"""  <!-- Navigation -->
  <header class="site-nav">
    <div class="container nav-layout">
      <a href="{prefix}" class="brand-wrapper" aria-label="Blue Cube Architects - Est. 2000 Chennai">
        <img src="{CDN_PREFIX}/brand/logo-dark.png" alt="Blue Cube Architects" class="brand-logo-img" width="240" height="30">
        <span class="brand-sub">Est. 2000 &bull; Chennai</span>
      </a>

      <div class="nav-right">
        <a href="https://wa.me/919962108988?text=Hello%20Blue%20Cube%20Architects%2C%20I%20would%20like%20to%20enquire%20about%20a%20project." target="_blank" rel="noopener" class="nav-whatsapp-link" aria-label="Chat with Blue Cube Architects on WhatsApp">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 6.91C9.36 6.91 9.07 6.97 8.83 7.23C8.59 7.49 7.9 8.14 7.9 9.47C7.9 10.8 8.87 12.08 9.01 12.27C9.14 12.46 10.9 15.19 13.62 16.36C14.27 16.64 14.77 16.81 15.17 16.94C15.82 17.15 16.42 17.12 16.89 17.05C17.41 16.97 18.49 16.39 18.72 15.75C18.95 15.11 18.95 14.56 18.88 14.45C18.81 14.34 18.63 14.27 18.36 14.14C18.09 14 16.76 13.34 16.51 13.25C16.26 13.16 16.08 13.12 15.9 13.39C15.72 13.66 15.2 14.27 15.04 14.45C14.88 14.63 14.72 14.65 14.45 14.51C14.18 14.37 13.31 14.09 12.28 13.17C11.47 12.45 10.93 11.56 10.77 11.29C10.61 11.02 10.75 10.87 10.89 10.73C11.01 10.61 11.16 10.41 11.3 10.25C11.44 10.09 11.49 9.97 11.58 9.79C11.67 9.61 11.62 9.45 11.55 9.32C11.48 9.19 10.95 7.89 10.73 7.36C10.51 6.84 10.29 6.91 10.13 6.91H9.53Z"/>
          </svg>
          <span class="nav-whatsapp-text">WhatsApp</span>
        </a>
        <a href="{prefix}contact/" class="nav-enquire-link">Enquire</a>
        <button class="menu-btn" aria-label="Open navigation menu">
          <span>Menu</span>
          <div class="menu-icon-bars">
            <span></span>
            <span></span>
          </div>
        </button>
      </div>
    </div>
  </header>

  <!-- Full-Height Drawer Menu -->
  <div class="nav-drawer" id="navDrawer" role="dialog" aria-modal="true" aria-hidden="true" aria-label="Site Navigation Drawer">
    <div class="drawer-header">
      <span class="brand-sub">Navigation</span>
      <button class="drawer-close-btn" aria-label="Close navigation menu">
        <span>Close &times;</span>
      </button>
    </div>

    <ul class="drawer-nav-list">
      <li><a href="{prefix}">Home</a></li>
      <li><a href="{prefix}about/">About</a></li>
      <li><a href="{prefix}projects/">Projects Index</a></li>
      <li><a href="{prefix}projects/residential/">Residential</a></li>
      <li><a href="{prefix}projects/commercial/">Commercial</a></li>
      <li><a href="{prefix}projects/interior/">Interiors</a></li>
      <li><a href="{prefix}projects/containers/">Containers</a></li>
      <li><a href="{prefix}contact/">Contact</a></li>
    </ul>

    <div class="drawer-footer">
      <div>
        <p class="meta-field-label">Studio Coordinates</p>
        <span>K-95, 16th Street, Anna Nagar East, Chennai 600102</span>
      </div>
      <div>
        <a href="https://wa.me/919962108988?text=Hello%20Blue%20Cube%20Architects%2C%20I%20would%20like%20to%20discuss%20an%20architectural%20or%20interior%20project." target="_blank" rel="noopener" class="drawer-whatsapp-btn" aria-label="Direct WhatsApp message to Blue Cube Architects">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 6.91C9.36 6.91 9.07 6.97 8.83 7.23C8.59 7.49 7.9 8.14 7.9 9.47C7.9 10.8 8.87 12.08 9.01 12.27C9.14 12.46 10.9 15.19 13.62 16.36C14.27 16.64 14.77 16.81 15.17 16.94C15.82 17.15 16.42 17.12 16.89 17.05C17.41 16.97 18.49 16.39 18.72 15.75C18.95 15.11 18.95 14.56 18.88 14.45C18.81 14.34 18.63 14.27 18.36 14.14C18.09 14 16.76 13.34 16.51 13.25C16.26 13.16 16.08 13.12 15.9 13.39C15.72 13.66 15.2 14.27 15.04 14.45C14.88 14.63 14.72 14.65 14.45 14.51C14.18 14.37 13.31 14.09 12.28 13.17C11.47 12.45 10.93 11.56 10.77 11.29C10.61 11.02 10.75 10.87 10.89 10.73C11.01 10.61 11.16 10.41 11.3 10.25C11.44 10.09 11.49 9.97 11.58 9.79C11.67 9.61 11.62 9.45 11.55 9.32C11.48 9.19 10.95 7.89 10.73 7.36C10.51 6.84 10.29 6.91 10.13 6.91H9.53Z"/>
          </svg>
          <span>WhatsApp Principal Architect</span>
        </a>
      </div>
    </div>
  </div>"""

# Reusable Footer HTML
def render_footer(depth=0):
    prefix = "../" * depth if depth > 0 else "./"
    return f"""  <!-- Lightbox Modal -->
  <div class="lightbox-modal" role="dialog" aria-modal="true" aria-label="Image Lightbox">
    <button class="lightbox-close-btn" aria-label="Close image">&times;</button>
    <button class="lightbox-nav-btn lightbox-prev-btn" aria-label="Previous image">&#10094;</button>
    <div class="lightbox-content">
      <img src="" alt="Enlarged project view" class="lightbox-img" width="1200" height="800">
    </div>
    <button class="lightbox-nav-btn lightbox-next-btn" aria-label="Next image">&#10095;</button>
  </div>

  <!-- Footer -->
  <footer class="site-footer">
    <div class="container">
      <div class="footer-columns" data-stagger>
        <div>
          <img src="{CDN_PREFIX}/brand/logo-white.png" alt="Blue Cube Architects" class="footer-logo-img" width="240" height="38">
          <p class="footer-brand-p">
            Established at the wake of the Millennium. Headquartered in Chennai, India. Headed by Principal Architect Mr. G. Harish.
          </p>
          <div style="margin-top: 20px;">
            <a href="https://wa.me/919962108988" target="_blank" rel="noopener" class="text-link" style="color: #FFFFFF; border-color: rgba(255,255,255,0.4);">
              <span>WhatsApp Direct</span> &rarr;
            </a>
          </div>
        </div>

        <div>
          <h3 class="footer-heading">Portfolios</h3>
          <ul class="footer-nav-list">
            <li><a href="{prefix}projects/residential/">Residential (38)</a></li>
            <li><a href="{prefix}projects/commercial/">Commercial (42)</a></li>
            <li><a href="{prefix}projects/interior/">Interior Design (55)</a></li>
            <li><a href="{prefix}projects/containers/">Containers (5)</a></li>
            <li><a href="{prefix}projects/">Complete Index (140)</a></li>
          </ul>
        </div>

        <div>
          <h3 class="footer-heading">Studio Address</h3>
          <p class="footer-brand-p">
            K-95, 16th Street,<br>
            Anna Nagar East,<br>
            Chennai &ndash; 600102,<br>
            Tamil Nadu, India.
          </p>
        </div>

        <div>
          <h3 class="footer-heading">Coordinates</h3>
          <ul class="footer-nav-list">
            <li><a href="tel:+919962108988">+91 99621 08988</a></li>
            <li><a href="tel:+919962908988">+91 99629 08988</a></li>
            <li><a href="mailto:design@bluecube.co.in">design@bluecube.co.in</a></li>
            <li><a href="mailto:career@bluecube.co.in">career@bluecube.co.in</a></li>
            <li><a href="https://instagram.com/bluecube.architects" target="_blank" rel="noopener">Instagram</a></li>
            <li><a href="https://www.facebook.com/bluecube.id/" target="_blank" rel="noopener">Facebook</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom-bar">
        <span>&copy; 2026 BLUE CUBE ARCHITECTS. ALL RIGHTS RESERVED. ESTABLISHED 2000 &bull; CHENNAI</span>
        <div style="display: flex; gap: 24px;">
          <a href="{prefix}contact/">Privacy &amp; Inquiries</a>
          <a href="#mainContent">Back to top &uarr;</a>
        </div>
      </div>
    </div>
  </footer>

  <script src="{prefix}assets/js/app.js?v=6"></script>

  <!-- Floating WhatsApp Quick-Action Pill -->
  <a href="https://wa.me/919962108988?text=Hello%20Blue%20Cube%20Architects%2C%20I%20would%20like%20to%20discuss%20an%20architecture%20or%20interior%20project." class="floating-whatsapp" target="_blank" rel="noopener" aria-label="Chat with Blue Cube Architects on WhatsApp">
    <svg class="whatsapp-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 6.91C9.36 6.91 9.07 6.97 8.83 7.23C8.59 7.49 7.9 8.14 7.9 9.47C7.9 10.8 8.87 12.08 9.01 12.27C9.14 12.46 10.9 15.19 13.62 16.36C14.27 16.64 14.77 16.81 15.17 16.94C15.82 17.15 16.42 17.12 16.89 17.05C17.41 16.97 18.49 16.39 18.72 15.75C18.95 15.11 18.95 14.56 18.88 14.45C18.81 14.34 18.63 14.27 18.36 14.14C18.09 14 16.76 13.34 16.51 13.25C16.26 13.16 16.08 13.12 15.9 13.39C15.72 13.66 15.2 14.27 15.04 14.45C14.88 14.63 14.72 14.65 14.45 14.51C14.18 14.37 13.31 14.09 12.28 13.17C11.47 12.45 10.93 11.56 10.77 11.29C10.61 11.02 10.75 10.87 10.89 10.73C11.01 10.61 11.16 10.41 11.3 10.25C11.44 10.09 11.49 9.97 11.58 9.79C11.67 9.61 11.62 9.45 11.55 9.32C11.48 9.19 10.95 7.89 10.73 7.36C10.51 6.84 10.29 6.91 10.13 6.91H9.53Z"/>
    </svg>
    <span class="whatsapp-label">WhatsApp</span>
  </a>"""

# Helper to render a project card for grids
def render_project_card(p, prefix="./"):
    slug = p["slug"]
    title = p["title"]
    subcat = p.get("subcategory", p.get("category"))
    loc = p.get("location", "Tamil Nadu, India")
    img_url = p.get("featured_image_url")
    desc = p.get("description", "")
    
    return f"""        <article class="portfolio-card" data-category="{p['category'].lower()}" data-subcat="{subcat.lower()}">
          <a href="{prefix}projects/{slug}/" class="portfolio-card-media" aria-label="View dossier for {title}">
            <img src="{img_url}" alt="{title} &bull; {loc}" class="portfolio-card-img" loading="lazy" width="600" height="375">
          </a>
          <div class="portfolio-card-info">
            <div class="portfolio-card-meta">
              <span>{loc}</span>
              <span>{p.get('year', 'Completed')}</span>
            </div>
            <h3 class="portfolio-card-title">
              <a href="{prefix}projects/{slug}/">{title}</a>
            </h3>
            <p class="portfolio-card-desc">{desc}</p>
            <a href="{prefix}projects/{slug}/" class="portfolio-card-action">
              <span>View Dossier</span> &rarr;
            </a>
          </div>
        </article>"""

# =========================================================================
# 2. GENERATE ALL INDIVIDUAL PROJECT DETAIL PAGES (/projects/[slug]/index.html)
# =========================================================================
def generate_project_pages():
    total_generated = 0
    for idx, p in enumerate(ALL_PROJECTS):
        slug = p["slug"]
        proj_dir = os.path.join("projects", slug)
        os.makedirs(proj_dir, exist_ok=True)
        file_path = os.path.join(proj_dir, "index.html")
        
        # Determine previous and next project in portfolio
        prev_p = ALL_PROJECTS[idx - 1] if idx > 0 else ALL_PROJECTS[-1]
        next_p = ALL_PROJECTS[idx + 1] if idx < len(ALL_PROJECTS) - 1 else ALL_PROJECTS[0]
        
        # Build category link
        cat_links = {
            "Residential": "../../projects/residential/",
            "Commercial": "../../projects/commercial/",
            "Interiors": "../../projects/interior/",
            "Container Architecture": "../../projects/containers/"
        }
        back_cat_url = cat_links.get(p["category"], "../../projects/")

        # Gallery breakdown:
        # gallery[0] = Hero
        # gallery[1] = Intro portrait / detail image (if >= 2 images)
        # gallery[2:] = Extra images for magazine-style editorial sequence
        gallery = p.get("gallery_urls", [])
        has_intro_image = len(gallery) >= 2
        intro_img = gallery[1] if has_intro_image else None
        extra_gallery = gallery[2:] if has_intro_image else []

        # Breadcrumbs
        breadcrumbs_html = f"""          <div class="editorial-breadcrumbs">
            <a href="../../projects/" class="editorial-breadcrumb-link">Projects</a>
            <span class="editorial-breadcrumb-sep">/</span>
            <a href="{back_cat_url}" class="editorial-breadcrumb-link">{p['category']}</a>
            <span class="editorial-breadcrumb-sep">/</span>
            <span>{p.get('subcategory', p['category'])}</span>
          </div>"""

        # Section D: Clean Editorial Metadata (verified fields only, no empty/placeholders)
        meta_items = []
        if p.get("location"):
            meta_items.append(("Location", p["location"]))

        cat_display = p.get("category", "")
        if p.get("subcategory") and p["subcategory"] != cat_display:
            cat_display = f"{cat_display} &bull; {p['subcategory']}"
        if cat_display:
            meta_items.append(("Category", cat_display))

        if p.get("typology") and p["typology"] != p.get("subcategory"):
            meta_items.append(("Typology", p["typology"]))

        if p.get("area") and p["area"].strip() not in ["", "Completed", "N/A", "Archive"]:
            meta_items.append(("Built-up Area", p["area"]))

        if p.get("year") and p["year"].strip() not in ["", "Completed", "Archive", "Blue Cube Archive"]:
            meta_items.append(("Year", p["year"]))

        if p.get("client") and p["client"].strip() not in ["", "Private Client", "Private Residence", "Client"]:
            meta_items.append(("Client", p["client"]))

        meta_rows_html = ""
        for label, val in meta_items:
            meta_rows_html += f"""            <div class="editorial-meta-row">
              <dt class="editorial-meta-label">{label}</dt>
              <dd class="editorial-meta-value">{val}</dd>
            </div>\n"""
        meta_table_html = f"""          <dl class="editorial-meta-table">
{meta_rows_html}          </dl>""" if meta_items else ""

        # Section F: Verified Narrative (no fake/invented specifications)
        desc_paragraphs = [para.strip() for para in p.get("description", "").split("\n") if para.strip()]
        narrative_html = ""
        if desc_paragraphs:
            narrative_html = '          <div class="editorial-narrative">\n'
            for para in desc_paragraphs:
                narrative_html += f'            <p>{para}</p>\n'
            narrative_html += '          </div>'

        # Section C: Editorial Introduction (Two-column if intro image exists, single column if 1 photo)
        if has_intro_image:
            intro_section_html = f"""    <!-- Section C & D & F: Editorial Project Introduction -->
    <section class="editorial-intro-section">
      <div class="container">
        <div class="editorial-intro-grid">
          <div class="editorial-intro-media" data-reveal="image">
            <img src="{intro_img}" 
                 alt="{p['title']} &mdash; Architectural Perspective" 
                 data-lightbox-src="{intro_img}"
                 loading="lazy" width="800" height="1050">
          </div>
          <div class="editorial-intro-content" data-reveal>
{breadcrumbs_html}
            <h1 class="editorial-project-title">{p['title']}</h1>
{meta_table_html}
{narrative_html}
          </div>
        </div>
      </div>
    </section>"""
        else:
            intro_section_html = f"""    <!-- Section C & D & F: Editorial Project Introduction -->
    <section class="editorial-intro-section">
      <div class="container">
        <div class="editorial-intro-single" data-reveal>
{breadcrumbs_html}
          <h1 class="editorial-project-title">{p['title']}</h1>
{meta_table_html}
{narrative_html}
        </div>
      </div>
    </section>"""

        # Section E: Editorial Gallery Stream (Magazine-style sequence for extra images)
        gallery_section_html = ""
        if extra_gallery:
            gallery_items = []
            i = 0
            pattern_idx = 0
            while i < len(extra_gallery):
                rem = len(extra_gallery) - i
                if rem == 1:
                    gallery_items.append(f"""        <div class="gallery-full-bleed" data-reveal="image">
          <img src="{extra_gallery[i]}" 
               alt="{p['title']} &mdash; Architectural Perspective" 
               data-lightbox-src="{extra_gallery[i]}" 
               loading="lazy" width="1600" height="1000">
        </div>""")
                    i += 1
                elif rem == 2:
                    gallery_items.append(f"""        <div class="gallery-two-up" data-reveal="image">
          <div class="gallery-two-up-item">
            <img src="{extra_gallery[i]}" alt="{p['title']} &mdash; Architectural View 1" data-lightbox-src="{extra_gallery[i]}" loading="lazy">
          </div>
          <div class="gallery-two-up-item">
            <img src="{extra_gallery[i+1]}" alt="{p['title']} &mdash; Architectural View 2" data-lightbox-src="{extra_gallery[i+1]}" loading="lazy">
          </div>
        </div>""")
                    i += 2
                else:
                    if pattern_idx % 2 == 0:
                        gallery_items.append(f"""        <div class="gallery-full-bleed" data-reveal="image">
          <img src="{extra_gallery[i]}" 
               alt="{p['title']} &mdash; Architectural Perspective" 
               data-lightbox-src="{extra_gallery[i]}" 
               loading="lazy" width="1600" height="1000">
        </div>""")
                        i += 1
                    else:
                        gallery_items.append(f"""        <div class="gallery-two-up" data-reveal="image">
          <div class="gallery-two-up-item">
            <img src="{extra_gallery[i]}" alt="{p['title']} &mdash; Architectural View 1" data-lightbox-src="{extra_gallery[i]}" loading="lazy">
          </div>
          <div class="gallery-two-up-item">
            <img src="{extra_gallery[i+1]}" alt="{p['title']} &mdash; Architectural View 2" data-lightbox-src="{extra_gallery[i+1]}" loading="lazy">
          </div>
        </div>""")
                        i += 2
                    pattern_idx += 1

            gallery_section_html = f"""    <!-- Section E: Editorial Image Gallery -->
    <section class="editorial-gallery-section">
      <div class="container">
        <div class="editorial-gallery-stream">
{chr(10).join(gallery_items)}
        </div>
      </div>
    </section>"""

        # Section G: Previous and Next Projects Navigation
        pagination_html = f"""    <!-- Section G: Previous and Next Projects Navigation -->
    <nav class="project-pagination" aria-label="Project pagination">
      <div class="container project-pagination-inner">
        <a href="../../projects/{prev_p['slug']}/" class="pagination-link prev" aria-label="Previous project: {prev_p['title']}">
          <span class="pagination-sub">&larr; Previous Project</span>
          <span class="pagination-title">{prev_p['title']}</span>
        </a>
        <a href="{back_cat_url}" class="pagination-center" aria-label="Return to {p['category']} portfolio">
          <span>{p['category']} Archive</span>
        </a>
        <a href="../../projects/{next_p['slug']}/" class="pagination-link next" aria-label="Next project: {next_p['title']}">
          <span class="pagination-sub">Next Project &rarr;</span>
          <span class="pagination-title">{next_p['title']}</span>
        </a>
      </div>
    </nav>"""

        # Section H: Related Projects
        related_cards_html = ""
        for rel in p.get("related_projects", []):
            related_cards_html += f"""        <article class="related-card">
          <a href="../../projects/{rel['slug']}/" class="related-card-media" aria-label="View {rel['title']}">
            <img src="{rel['featured_image_url']}" alt="{rel['title']} &bull; {rel['location']}" loading="lazy" width="600" height="375">
          </a>
          <div class="related-card-body">
            <div class="related-card-meta">
              <span>{rel['subcategory']}</span>
              <span>&bull;</span>
              <span>{rel['location']}</span>
            </div>
            <h4 class="related-card-title">
              <a href="../../projects/{rel['slug']}/">{rel['title']}</a>
            </h4>
            <a href="../../projects/{rel['slug']}/" class="related-card-link">
              <span>View Dossier</span> &rarr;
            </a>
          </div>
        </article>\n"""

        related_section_html = f"""    <!-- Section H: Related Projects -->
    <section class="editorial-related-section">
      <div class="container">
        <div class="related-header" data-reveal>
          <span class="editorial-meta-label">Selected Works</span>
          <h3 class="related-title">Related Projects</h3>
        </div>
        <div class="related-grid" data-stagger>
{related_cards_html}        </div>
      </div>
    </section>"""

        # Section I: Project Enquiry CTA
        whatsapp_title = p['title'].replace(' ', '%20')
        enquiry_project = p['title'].replace(' ', '+')
        enquiry_section_html = f"""    <!-- Section I: Project Enquiry CTA -->
    <section class="editorial-enquiry-section">
      <div class="container">
        <div class="editorial-enquiry-box" data-reveal>
          <span class="editorial-meta-label">Project Consultation</span>
          <h3 class="enquiry-heading">Have a similar project in mind?</h3>
          <p class="enquiry-text">
            Bluecube Architects provides bespoke architectural planning, interior styling, and structural execution across Tamil Nadu and South India.
          </p>
          <div class="enquiry-actions">
            <a href="https://wa.me/919962108988?text=Hello%20Blue%20Cube%20Architects%2C%20I%20would%20like%20to%20discuss%20a%20project%20similar%20to%20{whatsapp_title}." target="_blank" rel="noopener" class="enquiry-btn whatsapp-btn" aria-label="Chat with Bluecube on WhatsApp">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 6.91C9.36 6.91 9.07 6.97 8.83 7.23C8.59 7.49 7.9 8.14 7.9 9.47C7.9 10.8 8.87 12.08 9.01 12.27C9.14 12.46 10.9 15.19 13.62 16.36C14.27 16.64 14.77 16.81 15.17 16.94C15.82 17.15 16.42 17.12 16.89 17.05C17.41 16.97 18.49 16.39 18.72 15.75C18.95 15.11 18.95 14.56 18.88 14.45C18.81 14.34 18.63 14.27 18.36 14.14C18.09 14 16.76 13.34 16.51 13.25C16.26 13.16 16.08 13.12 15.9 13.39C15.72 13.66 15.2 14.27 15.04 14.45C14.88 14.63 14.72 14.65 14.45 14.51C14.18 14.37 13.31 14.09 12.28 13.17C11.47 12.45 10.93 11.56 10.77 11.29C10.61 11.02 10.75 10.87 10.89 10.73C11.01 10.61 11.16 10.41 11.3 10.25C11.44 10.09 11.49 9.97 11.58 9.79C11.67 9.61 11.62 9.45 11.55 9.32C11.48 9.19 10.95 7.89 10.73 7.36C10.51 6.84 10.29 6.91 10.13 6.91H9.53Z"/>
              </svg>
              <span>WhatsApp Studio</span>
            </a>
            <a href="tel:+919962108988" class="enquiry-btn call-btn" aria-label="Call Bluecube Architects">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span>+91 99621 08988</span>
            </a>
            <a href="../../contact/?project={enquiry_project}" class="enquiry-btn form-btn">
              <span>Project Enquiry &rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </section>"""

        clean_desc = p.get('description', '').replace('"', '&quot;').strip()

        html_content = f"""<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{p['title']} | Blue Cube Architects Chennai</title>
  <meta name="description" content="{p['title']} ({p.get('location')}) designed by Blue Cube Architects Chennai. {clean_desc[:150]}...">
  <link rel="canonical" href="{BASE_URL}/projects/{slug}/">
  <meta property="og:title" content="{p['title']} | Blue Cube Architects">
  <meta property="og:description" content="{clean_desc[:200]}">
  <meta property="og:image" content="{p['featured_image_url']}">
  <meta property="og:type" content="article">
  <link rel="stylesheet" href="../../assets/css/main.css?v=7">

  <!-- Schema.org Structural Metadata -->
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": "{p['title']}",
    "headline": "{p['title']} by Blue Cube Architects",
    "description": "{clean_desc}",
    "image": "{p['featured_image_url']}",
    "creator": {{
      "@type": "Organization",
      "name": "Blue Cube Architects",
      "url": "{BASE_URL}"
    }},
    "locationCreated": {{
      "@type": "Place",
      "name": "{p.get('location')}"
    }}
  }}
  </script>
</head>
<body>

{render_nav(depth=2)}

  <main id="mainContent">
    <!-- Section B: Full-Width Cinematic Architectural Hero -->
    <section class="editorial-hero">
      <div class="editorial-hero-container">
        <div class="editorial-hero-frame" data-reveal="image">
          <img src="{p['featured_image_url']}" 
               alt="{p['title']} &mdash; {p.get('location')} Architectural View" 
               data-lightbox-src="{p['featured_image_url']}"
               class="editorial-hero-img" 
               width="1920" height="1080"
               fetchpriority="high"
               loading="eager">
        </div>
      </div>
    </section>

{intro_section_html}

{gallery_section_html}

{pagination_html}

{related_section_html}

{enquiry_section_html}
  </main>

{render_footer(depth=2)}
</body>
</html>"""
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        total_generated += 1

    print(f"Generated {total_generated} individual project pages at /projects/[slug]/index.html")

generate_project_pages()

# =========================================================================
# 3. GENERATE CATEGORY LISTING PAGES
# =========================================================================
def generate_category_pages():
    categories_cfg = [
        {
            "name": "Residential",
            "title": "Residential Architecture",
            "eyebrow": "Portfolio &bull; Built Environment",
            "desc": "Bespoke residences, coastal villas, high-density apartment communities, and country estates across Tamil Nadu, crafted with passive climate wisdom and enduring materiality.",
            "projects": pdata.RESIDENTIAL_PROJECTS,
            "dest_dir": "projects/residential",
            "subcats": ["All", "Bespoke Residences", "Villas & Country Homes", "Apartment Buildings"]
        },
        {
            "name": "Commercial",
            "title": "Commercial Architecture",
            "eyebrow": "Portfolio &bull; Commercial &amp; Institutional",
            "desc": "High-visibility automobile showrooms, multi-tenanted commercial complexes, specialized healthcare hospitals, educational campuses, and corporate headquarters.",
            "projects": pdata.COMMERCIAL_PROJECTS,
            "dest_dir": "projects/commercial",
            "subcats": ["All", "Retail & Showrooms", "Commercial Buildings", "Healthcare & Clinics", "Institutional & Education", "Hospitality & Dining", "Industrial & Warehousing", "Studios & Special Facilities"]
        },
        {
            "name": "Interiors",
            "title": "Interior Design Portfolio",
            "eyebrow": "Portfolio &bull; Bespoke Spatial Styling",
            "desc": "Premier corporate office headquarters, luxury aesthetic dermatology clinics, fine jewellery flagship salons, resort clubhouses, and bespoke private residences.",
            "projects": pdata.INTERIOR_PROJECTS,
            "dest_dir": "projects/interior",
            "subcats": ["All", "Corporate Offices", "Retail & Boutiques", "Healthcare & Clinics", "Clubhouses & Hospitality", "Residential Interiors", "Restaurants & Lounges"]
        },
        {
            "name": "Container Architecture",
            "title": "Container Architecture &amp; Modular Spaces",
            "eyebrow": "Portfolio &bull; Modular Engineering",
            "desc": "Eco-friendly, high-performance shipping container transformations into acoustic music studios, coastal hotel suites, creative agencies, and intermodal logistics yards.",
            "projects": pdata.CONTAINER_PROJECTS,
            "dest_dir": "projects/containers",
            "subcats": ["All", "Container Studios", "Container Hospitality", "Container Yards & Logistics", "Container Warehouses"]
        }
    ]

    for cat in categories_cfg:
        os.makedirs(cat["dest_dir"], exist_ok=True)
        dest_file = os.path.join(cat["dest_dir"], "index.html")
        
        # Subcat filter chips markup
        subcat_chips = ""
        for s in cat["subcats"]:
            active = "active" if s == "All" else ""
            subcat_chips += f"""<button class="subcat-chip {active}" data-filter="{s.lower()}">{s}</button>\n"""

        # Cards markup
        cards_html = ""
        for p in cat["projects"]:
            cards_html += render_project_card(p, prefix="../../")

        content = f"""<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{cat['title']} | Blue Cube Architects Chennai</title>
  <meta name="description" content="Explore every {cat['name'].lower()} project designed by Blue Cube Architects Chennai. Complete portfolio archive of {len(cat['projects'])} works.">
  <link rel="canonical" href="{BASE_URL}/{cat['dest_dir']}/">
  <link rel="stylesheet" href="../../assets/css/main.css?v=6">
</head>
<body>

{render_nav(depth=2)}

  <main id="mainContent">
    <!-- Category Hero -->
    <section class="page-hero">
      <div class="container">
        <span class="label-eyebrow" data-reveal style="--i:0;">{cat['eyebrow']}</span>
        <h1 class="heading-display" data-split>{cat['title']}</h1>
        <p class="p-editorial" data-reveal style="--i:1;">
          {cat['desc']}
        </p>

        <!-- Category Switching Tabs -->
        <nav class="portfolio-nav-bar" aria-label="Portfolio Category Navigation">
          <a href="../" class="portfolio-tab-link">All Works <span class="badge-count">140</span></a>
          <a href="../residential/" class="portfolio-tab-link {'active' if cat['name'] == 'Residential' else ''}">Residential <span class="badge-count">38</span></a>
          <a href="../commercial/" class="portfolio-tab-link {'active' if cat['name'] == 'Commercial' else ''}">Commercial <span class="badge-count">42</span></a>
          <a href="../interior/" class="portfolio-tab-link {'active' if cat['name'] == 'Interiors' else ''}">Interiors <span class="badge-count">55</span></a>
          <a href="../containers/" class="portfolio-tab-link {'active' if cat['name'] == 'Container Architecture' else ''}">Containers <span class="badge-count">5</span></a>
        </nav>

        <!-- Subcategory Filter & Search Controls -->
        <div class="portfolio-controls-bar">
          <div class="portfolio-filter-tags">
            {subcat_chips}
          </div>
          <div class="portfolio-search-box">
            <svg class="portfolio-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" class="portfolio-search-input" id="portfolioSearch" placeholder="Search {cat['name'].lower()} by name or location...">
          </div>
        </div>
      </div>
    </section>

    <!-- Complete Category Projects Grid -->
    <section class="container">
      <div class="portfolio-grid" id="portfolioGrid">
{cards_html}      </div>
      <div id="noResultsMsg" style="display: none; text-align: center; padding: 64px 0; color: var(--bark-medium);">
        <p class="heading-section">No projects match the selected search criteria.</p>
        <button class="subcat-chip" id="resetFilterBtn" style="margin-top: 16px;">Reset Filter &rarr;</button>
      </div>
    </section>
  </main>

{render_footer(depth=2)}

  <!-- Live Client-Side Filtering & Search Script -->
  <script>
    document.addEventListener('DOMContentLoaded', () => {{
      const searchInput = document.getElementById('portfolioSearch');
      const chips = document.querySelectorAll('.subcat-chip');
      const cards = document.querySelectorAll('.portfolio-card');
      const noResults = document.getElementById('noResultsMsg');
      const resetBtn = document.getElementById('resetFilterBtn');

      let currentSubcat = 'all';
      let currentQuery = '';

      function filterCards() {{
        let visibleCount = 0;
        cards.forEach(card => {{
          const subcat = card.getAttribute('data-subcat') || '';
          const text = card.textContent.toLowerCase();

          const matchesSubcat = (currentSubcat === 'all') || subcat.includes(currentSubcat);
          const matchesQuery = !currentQuery || text.includes(currentQuery);

          if (matchesSubcat && matchesQuery) {{
            card.style.display = 'flex';
            visibleCount++;
          }} else {{
            card.style.display = 'none';
          }}
        }});

        if (noResults) {{
          noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }}
      }}

      chips.forEach(chip => {{
        chip.addEventListener('click', () => {{
          chips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          currentSubcat = chip.getAttribute('data-filter');
          filterCards();
        }});
      }});

      if (searchInput) {{
        searchInput.addEventListener('input', (e) => {{
          currentQuery = e.target.value.toLowerCase().trim();
          filterCards();
        }});
      }}

      if (resetBtn) {{
        resetBtn.addEventListener('click', () => {{
          if (searchInput) searchInput.value = '';
          currentQuery = '';
          currentSubcat = 'all';
          chips.forEach(c => c.classList.remove('active'));
          chips[0]?.classList.add('active');
          filterCards();
        }});
      }}
    }});
  </script>
</body>
</html>"""
        with open(dest_file, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Generated category listing: {dest_file} ({len(cat['projects'])} works)")

generate_category_pages()

# =========================================================================
# 4. GENERATE COMPLETE ALL-PROJECTS INDEX (/projects/index.html)
# =========================================================================
def generate_all_projects_index():
    dest_file = "projects/index.html"
    
    # Render all 140 cards
    cards_html = ""
    for p in ALL_PROJECTS:
        cards_html += render_project_card(p, prefix="../")

    content = f"""<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Works Archive | Blue Cube Architects Chennai</title>
  <meta name="description" content="Explore every architectural, commercial, interior, and container project by Blue Cube Architects Chennai. Authoritative 140-project portfolio catalog.">
  <link rel="canonical" href="{BASE_URL}/projects/">
  <link rel="stylesheet" href="../assets/css/main.css?v=6">
</head>
<body>

{render_nav(depth=1)}

  <main id="mainContent">
    <!-- Page Hero -->
    <section class="page-hero">
      <div class="container">
        <span class="label-eyebrow" data-reveal style="--i:0;">Complete Works Archive &bull; Est. 2000</span>
        <h1 class="heading-display" data-split>Projects Archive</h1>
        <p class="p-editorial" data-reveal style="--i:1;">
          Every project listed in the Bluecube master portfolio tree. Explore 140 bespoke residences, commercial developments, interior styling works, and container architectures executed over two decades of practice.
        </p>

        <!-- Category Filter Tabs -->
        <nav class="portfolio-nav-bar" aria-label="Portfolio Category Navigation">
          <button class="portfolio-tab-link active" data-cat="all">All Works <span class="badge-count">140</span></button>
          <a href="residential/" class="portfolio-tab-link" data-cat="residential">Residential <span class="badge-count">38</span></a>
          <a href="commercial/" class="portfolio-tab-link" data-cat="commercial">Commercial <span class="badge-count">42</span></a>
          <a href="interior/" class="portfolio-tab-link" data-cat="interiors">Interiors <span class="badge-count">55</span></a>
          <a href="containers/" class="portfolio-tab-link" data-cat="container architecture">Containers <span class="badge-count">5</span></a>
        </nav>

        <!-- Interactive Search & Counter Bar -->
        <div class="portfolio-controls-bar">
          <div style="font-family: var(--font-tech); font-size: 0.85rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--bark-medium);">
            Showing <span id="projectCountDisplay" style="font-weight: 700; color: var(--bark);">140</span> of 140 Projects
          </div>
          <div class="portfolio-search-box">
            <svg class="portfolio-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" class="portfolio-search-input" id="portfolioSearch" placeholder="Search all 140 projects by name, client, or location...">
          </div>
        </div>
      </div>
    </section>

    <!-- Complete 140 Projects Grid -->
    <section class="container">
      <div class="portfolio-grid" id="portfolioGrid">
{cards_html}      </div>
      <div id="noResultsMsg" style="display: none; text-align: center; padding: 64px 0; color: var(--bark-medium);">
        <p class="heading-section">No projects match your search query.</p>
        <button class="subcat-chip" id="resetFilterBtn" style="margin-top: 16px;">Clear Search &rarr;</button>
      </div>
    </section>
  </main>

{render_footer(depth=1)}

  <!-- Search & Live Filter Script -->
  <script>
    document.addEventListener('DOMContentLoaded', () => {{
      const searchInput = document.getElementById('portfolioSearch');
      const cards = document.querySelectorAll('.portfolio-card');
      const countDisplay = document.getElementById('projectCountDisplay');
      const noResults = document.getElementById('noResultsMsg');
      const resetBtn = document.getElementById('resetFilterBtn');

      function filterCards() {{
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        let visibleCount = 0;

        cards.forEach(card => {{
          const text = card.textContent.toLowerCase();
          if (!query || text.includes(query)) {{
            card.style.display = 'flex';
            visibleCount++;
          }} else {{
            card.style.display = 'none';
          }}
        }});

        if (countDisplay) {{
          countDisplay.textContent = visibleCount;
        }}

        if (noResults) {{
          noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }}
      }}

      if (searchInput) {{
        searchInput.addEventListener('input', filterCards);
      }}

      if (resetBtn) {{
        resetBtn.addEventListener('click', () => {{
          if (searchInput) searchInput.value = '';
          filterCards();
        }});
      }}
    }});
  </script>
</body>
</html>"""
    with open(dest_file, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated complete portfolio index: {dest_file} (140 works)")

generate_all_projects_index()

# Also update root alias files to point cleanly
ROOT_ALIASES = [
    ("residential.html", "projects/residential/"),
    ("commercial.html", "projects/commercial/"),
    ("interiors.html", "projects/interior/"),
    ("container-architecture.html", "projects/containers/"),
    ("projects/kun-capital-kia-showroom-kovilambakkam/index.html", "../kia-showroom-kovilambakkam/"),
    ("projects/gruham-cuddalore/index.html", "../gruham-residence-cuddalore/")
]

for alias_file, target_route in ROOT_ALIASES:
    os.makedirs(os.path.dirname(alias_file) if os.path.dirname(alias_file) else ".", exist_ok=True)
    html_redirect = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url={target_route}">
  <title>Redirecting to {target_route} | Blue Cube Architects</title>
  <link rel="canonical" href="{BASE_URL}/{target_route.replace('../', 'projects/')}">
</head>
<body style="background: #CAC5BA; color: #2F2218; font-family: sans-serif; text-align: center; padding-top: 20vh;">
  <p>Redirecting to <a href="{target_route}" style="color: #1F3A5F; font-weight: bold;">{target_route}</a>...</p>
</body>
</html>"""
    with open(alias_file, "w", encoding="utf-8") as f:
        f.write(html_redirect)
    print(f"Updated alias redirect: {alias_file} -> {target_route}")

# =========================================================================
# 5. GENERATE COMPREHENSIVE SITEMAP (sitemap.xml)
# =========================================================================
def generate_sitemap():
    sitemap_path = "sitemap.xml"
    today = datetime.now().strftime("%Y-%m-%d")

    static_urls = [
        ("/", "1.0", "weekly"),
        ("/about/", "0.9", "monthly"),
        ("/contact/", "0.9", "monthly"),
        ("/projects/", "0.95", "weekly"),
        ("/projects/residential/", "0.9", "weekly"),
        ("/projects/commercial/", "0.9", "weekly"),
        ("/projects/interior/", "0.9", "weekly"),
        ("/projects/containers/", "0.9", "weekly"),
    ]

    xml = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

    for path, prio, freq in static_urls:
        xml.append('  <url>')
        xml.append(f'    <loc>{BASE_URL}{path}</loc>')
        xml.append(f'    <lastmod>{today}</lastmod>')
        xml.append(f'    <changefreq>{freq}</changefreq>')
        xml.append(f'    <priority>{prio}</priority>')
        xml.append('  </url>')

    # Add all 140 project URLs
    for p in ALL_PROJECTS:
        xml.append('  <url>')
        xml.append(f'    <loc>{BASE_URL}/projects/{p["slug"]}/</loc>')
        xml.append(f'    <lastmod>{today}</lastmod>')
        xml.append('    <changefreq>monthly</changefreq>')
        xml.append('    <priority>0.8</priority>')
        xml.append('  </url>')

    xml.append('</urlset>')

    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write("\n".join(xml) + "\n")

    print(f"Generated comprehensive sitemap.xml with {len(static_urls) + len(ALL_PROJECTS)} URLs")

generate_sitemap()
print("Master build complete.")
