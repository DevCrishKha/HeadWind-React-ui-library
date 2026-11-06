import { useState } from "react";
import { UI } from "@devcrish/headwind";

/**
 * StaticPage component
 * A clean, spacious, and elegant website for "HopeWell Medical Center".
 * Features a large serene background image, uncluttered layout,
 * airy typography, and clean medical service cards.
 */
export default function StaticPage({ onBack }) {
  // Toggle between Deployed Mode (pure static page) and Edit Mode (visual layout editor)
  const [deployMode, setDeployMode] = useState(true);

  const handleBookAppointment = () => {
    alert(
      "Appointment Request Received! Our patient care coordinator will contact you shortly.",
    );
  };

  const handleCallEmergency = () => {
    alert("Calling HopeWell Emergency Department: (800) 555-0199");
  };

  return (
    <UI.Canvas
      deploy={deployMode}
      background="#f8fafc"
      style={{
        minHeight: "1380px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          TOP CONTROL BAR (Clean, subtle mode toggle)
      â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <UI.ParentPanel
        id="topBar"
        position={{ x: 60, y: 16 }}
        size={{ width: 1160, height: 42 }}
        backgroundColor="#ffffff"
        border="1px solid #e2e8f0"
        borderRadius={8}
        padding="6px 16px"
        title="Page View"
        showDragHandle={false}
      >
        <UI.Badge
          id="modeBadge"
          position={{ x: 14, y: 7 }}
          size={{ width: 165, height: 26 }}
          variant={deployMode ? "success" : "warning"}
          text={deployMode ? "HOSPITAL WEBSITE VIEW" : "STUDIO EDIT MODE"}
          fontSize={11}
        />
        <UI.Text
          id="modeInfo"
          position={{ x: 195, y: 9 }}
          size={{ width: 620, height: 22 }}
          text={
            deployMode
              ? "Clean static presentation. All editing handles and overlays are frozen."
              : "Studio editing active: drag any card or element to reposition."
          }
          color="#64748b"
          fontSize={12}
        />
        <UI.Button
          id="modeToggleBtn"
          position={{ x: 840, y: 4 }}
          size={{ width: 170, height: 32 }}
          variant={deployMode ? "outline" : "primary"}
          text={deployMode ? "Enable Visual Editing" : "Switch to Static View"}
          onClick={() => setDeployMode(!deployMode)}
          style={{ fontSize: "12px" }}
        />
        {onBack && (
          <UI.Button
            id="backBtn"
            position={{ x: 1025, y: 4 }}
            size={{ width: 120, height: 32 }}
            variant="ghost"
            text="â† Return to App"
            onClick={onBack}
            style={{ fontSize: "12px", color: "#0284c7" }}
          />
        )}
      </UI.ParentPanel>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          NAVIGATION HEADER
      â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <UI.ParentPanel
        id="headerNav"
        position={{ x: 60, y: 68 }}
        size={{ width: 1160, height: 72 }}
        backgroundColor="#ffffff"
        border="1px solid #e2e8f0"
        borderRadius={12}
        padding="12px 24px"
        title="Navigation"
        showDragHandle={false}
      >
        {/* Hospital Logo & Brand Name */}
        <UI.Icon
          id="logoIcon"
          position={{ x: 20, y: 16 }}
          size={{ width: 38, height: 38 }}
          name="heart"
          color="#0284c7"
          sizeProp={26}
        />
        <UI.Heading
          id="brandHeading"
          position={{ x: 66, y: 16 }}
          size={{ width: 250, height: 38 }}
          level={3}
          text="HopeWell Health"
          color="#0f172a"
          fontSize={22}
          fontWeight={800}
        />

        {/* Clean Nav Links */}
        <UI.Button
          id="navDoctors"
          position={{ x: 380, y: 18 }}
          size={{ width: 110, height: 36 }}
          variant="ghost"
          text="Find a Doctor"
          color="#334155"
          style={{ fontSize: "14px" }}
        />
        <UI.Button
          id="navDepartments"
          position={{ x: 500, y: 18 }}
          size={{ width: 110, height: 36 }}
          variant="ghost"
          text="Departments"
          color="#334155"
          style={{ fontSize: "14px" }}
        />
        <UI.Button
          id="navLocations"
          position={{ x: 620, y: 18 }}
          size={{ width: 95, height: 36 }}
          variant="ghost"
          text="Locations"
          color="#334155"
          style={{ fontSize: "14px" }}
        />
        <UI.Button
          id="navPortal"
          position={{ x: 725, y: 18 }}
          size={{ width: 115, height: 36 }}
          variant="ghost"
          text="Patient Portal"
          color="#334155"
          style={{ fontSize: "14px" }}
        />

        {/* 24/7 Hotline Badge & CTA Button */}
        <UI.Badge
          id="erHotlineBadge"
          position={{ x: 855, y: 22 }}
          size={{ width: 130, height: 28 }}
          variant="danger"
          text="24/7 ER OPEN"
          fontSize={11}
          fontWeight={700}
        />
        <UI.Button
          id="headerBookBtn"
          position={{ x: 995, y: 16 }}
          size={{ width: 150, height: 40 }}
          variant="primary"
          backgroundColor="#0284c7"
          text="Book Appointment"
          onClick={handleBookAppointment}
          style={{ fontSize: "13px", fontWeight: "600" }}
        />
      </UI.ParentPanel>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          HERO SECTION WITH LARGE HOSPITAL BACKGROUND IMAGE
      â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* Large hospital image as background */}
      <UI.Img
        id="heroBgImage"
        position={{ x: 60, y: 152 }}
        size={{ width: 1160, height: 480 }}
        src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80"
        alt="HopeWell Modern Medical Hospital"
        objectFit="none"
        borderRadius={16}
      />

      {/* Spacious Floating Hero Card with high contrast and breathing room */}
      <UI.ParentPanel
        id="heroCard"
        position={{ x: 95, y: 188 }}
        size={{ width: 490, height: 405 }}
        backgroundColor="rgba(255, 255, 255, 0.94)"
        border="1px solid rgba(226, 232, 240, 0.9)"
        borderRadius={14}
        boxShadow="0 20px 35px -5px rgba(0, 0, 0, 0.12)"
        title="Welcome to HopeWell"
        showDragHandle={true}
      >
        <UI.Badge
          id="heroCategoryPill"
          position={{ x: 28, y: 22 }}
          size={{ width: 230, height: 28 }}
          variant="primary"
          text="âœ¦ NATIONALLY RANKED HOSPITAL"
          fontSize={11}
          fontWeight={700}
          backgroundColor="#e0f2fe"
          color="#0369a1"
        />
        <UI.Heading
          id="heroTitle"
          position={{ x: 28, y: 62 }}
          size={{ width: 434, height: 90 }}
          level={1}
          text="Your health, our lifelong commitment."
          color="#0f172a"
          fontSize={32}
          fontWeight={800}
          lineHeight={1.25}
        />
        <UI.Paragraph
          id="heroDescription"
          position={{ x: 28, y: 164 }}
          size={{ width: 434, height: 80 }}
          color="#475569"
          fontSize={15}
          lineHeight={1.6}
          text="Providing compassionate personalized care, leading clinical researchers, and cutting-edge medical technology for you and your family."
        />
        <UI.Button
          id="heroBookBtn"
          position={{ x: 28, y: 265 }}
          size={{ width: 195, height: 48 }}
          variant="primary"
          backgroundColor="#0284c7"
          text="Book an Appointment"
          onClick={handleBookAppointment}
          style={{ fontSize: "14px", fontWeight: "600" }}
        />
        <UI.Button
          id="heroSpecialistsBtn"
          position={{ x: 235, y: 265 }}
          size={{ width: 165, height: 48 }}
          variant="outline"
          color="#0284c7"
          text="Our Specialists"
          onClick={() =>
            alert("Exploring HopeWell Board-Certified Physicians...")
          }
          style={{ fontSize: "14px", borderColor: "#bae6fd" }}
        />
        <UI.Text
          id="heroEmergencyNote"
          position={{ x: 28, y: 335 }}
          size={{ width: 430, height: 26 }}
          text="Immediate emergency? Call our 24/7 hotline at (800) 555-0199"
          color="#64748b"
          fontSize={12}
        />
      </UI.ParentPanel>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          SECTION: SPECIALIZED MEDICAL SERVICES (3 CLEAN CARDS)
      â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <UI.Badge
        id="servicesBadge"
        position={{ x: 60, y: 660 }}
        size={{ width: 180, height: 28 }}
        variant="default"
        text="CLINICAL EXCELLENCE"
        fontSize={11}
        fontWeight={600}
      />
      <UI.Heading
        id="servicesHeading"
        position={{ x: 60, y: 698 }}
        size={{ width: 680, height: 38 }}
        level={2}
        text="Specialized Care for Every Stage of Life"
        color="#0f172a"
        fontSize={26}
        fontWeight={800}
      />
      <UI.Paragraph
        id="servicesSubtitle"
        position={{ x: 60, y: 742 }}
        size={{ width: 750, height: 32 }}
        color="#64748b"
        fontSize={15}
        text="Our multidisciplinary medical staff delivers comprehensive preventive care, advanced treatment, and therapy."
      />

      {/* Service Card 1: Primary & Urgent Care */}
      <UI.ParentPanel
        id="cardPrimaryCare"
        position={{ x: 60, y: 792 }}
        size={{ width: 366, height: 250 }}
        backgroundColor="#ffffff"
        border="1px solid #e2e8f0"
        borderRadius={12}
        title="Primary Care"
        showDragHandle={true}
      >
        <UI.Icon
          id="iconPrimaryCare"
          position={{ x: 24, y: 20 }}
          size={{ width: 38, height: 38 }}
          name="clock"
          color="#0284c7"
          sizeProp={28}
        />
        <UI.Heading
          id="titlePrimaryCare"
          position={{ x: 24, y: 68 }}
          size={{ width: 310, height: 32 }}
          level={3}
          text="Primary & Urgent Care"
          color="#0f172a"
          fontSize={19}
          fontWeight={700}
        />
        <UI.Paragraph
          id="descPrimaryCare"
          position={{ x: 24, y: 106 }}
          size={{ width: 318, height: 68 }}
          color="#64748b"
          fontSize={14}
          lineHeight={1.5}
          text="Same-day doctor visits, routine health checkups, preventive immunizations, and treatment for everyday wellness."
        />
        <UI.Button
          id="btnPrimaryCare"
          position={{ x: 20, y: 188 }}
          size={{ width: 160, height: 38 }}
          variant="ghost"
          color="#0284c7"
          text="Find a Clinic â†’"
          onClick={() =>
            alert("Showing nearest HopeWell Primary Care clinics...")
          }
          style={{ fontSize: "14px", fontWeight: "600" }}
        />
      </UI.ParentPanel>

      {/* Service Card 2: Cardiology & Heart Institute */}
      <UI.ParentPanel
        id="cardCardiology"
        position={{ x: 456, y: 792 }}
        size={{ width: 366, height: 250 }}
        backgroundColor="#ffffff"
        border="1px solid #e2e8f0"
        borderRadius={12}
        title="Cardiology"
        showDragHandle={true}
      >
        <UI.Icon
          id="iconCardiology"
          position={{ x: 24, y: 20 }}
          size={{ width: 38, height: 38 }}
          name="heart"
          color="#e11d48"
          sizeProp={28}
        />
        <UI.Heading
          id="titleCardiology"
          position={{ x: 24, y: 68 }}
          size={{ width: 310, height: 32 }}
          level={3}
          text="Heart & Vascular Institute"
          color="#0f172a"
          fontSize={19}
          fontWeight={700}
        />
        <UI.Paragraph
          id="descCardiology"
          position={{ x: 24, y: 106 }}
          size={{ width: 318, height: 68 }}
          color="#64748b"
          fontSize={14}
          lineHeight={1.5}
          text="Comprehensive cardiac evaluation, advanced catheterization, vascular surgery, and ongoing heart rehabilitation."
        />
        <UI.Button
          id="btnCardiology"
          position={{ x: 20, y: 188 }}
          size={{ width: 170, height: 38 }}
          variant="ghost"
          color="#e11d48"
          text="Heart Specialists â†’"
          onClick={() => alert("Exploring Cardiology & Vascular team...")}
          style={{ fontSize: "14px", fontWeight: "600" }}
        />
      </UI.ParentPanel>

      {/* Service Card 3: Advanced Diagnostics */}
      <UI.ParentPanel
        id="cardDiagnostics"
        position={{ x: 852, y: 792 }}
        size={{ width: 368, height: 250 }}
        backgroundColor="#ffffff"
        border="1px solid #e2e8f0"
        borderRadius={12}
        title="Diagnostics"
        showDragHandle={true}
      >
        <UI.Icon
          id="iconDiagnostics"
          position={{ x: 24, y: 20 }}
          size={{ width: 38, height: 38 }}
          name="search"
          color="#059669"
          sizeProp={28}
        />
        <UI.Heading
          id="titleDiagnostics"
          position={{ x: 24, y: 68 }}
          size={{ width: 310, height: 32 }}
          level={3}
          text="Diagnostics & Imaging"
          color="#0f172a"
          fontSize={19}
          fontWeight={700}
        />
        <UI.Paragraph
          id="descDiagnostics"
          position={{ x: 24, y: 106 }}
          size={{ width: 318, height: 68 }}
          color="#64748b"
          fontSize={14}
          lineHeight={1.5}
          text="State-of-the-art MRI, ultra-low dose CT scans, 3D mammography, digital ultrasound, and accredited automated labs."
        />
        <UI.Button
          id="btnDiagnostics"
          position={{ x: 20, y: 188 }}
          size={{ width: 160, height: 38 }}
          variant="ghost"
          color="#059669"
          text="Book a Scan â†’"
          onClick={() => alert("Opening Diagnostic Imaging schedule...")}
          style={{ fontSize: "14px", fontWeight: "600" }}
        />
      </UI.ParentPanel>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          SECTION: APPOINTMENT & CONTACT BANNER
      â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <UI.ParentPanel
        id="contactBanner"
        position={{ x: 60, y: 1070 }}
        size={{ width: 1160, height: 104 }}
        backgroundColor="#f0f9ff"
        border="1px solid #bae6fd"
        borderRadius={12}
        title="Contact"
        showDragHandle={false}
      >
        <UI.Icon
          id="phoneIcon"
          position={{ x: 24, y: 32 }}
          size={{ width: 36, height: 36 }}
          name="phone"
          color="#0284c7"
          sizeProp={26}
        />
        <UI.Heading
          id="contactHeading"
          position={{ x: 74, y: 22 }}
          size={{ width: 620, height: 30 }}
          level={4}
          text="Need assistance or have questions about our medical services?"
          color="#0369a1"
          fontSize={17}
          fontWeight={700}
        />
        <UI.Paragraph
          id="contactSub"
          position={{ x: 74, y: 54 }}
          size={{ width: 620, height: 26 }}
          text="Our patient care team is available 7 days a week: 7:00 AM - 9:00 PM EST."
          color="#0284c7"
          fontSize={13}
        />
        <UI.Button
          id="callUsBtn"
          position={{ x: 750, y: 30 }}
          size={{ width: 190, height: 44 }}
          variant="primary"
          backgroundColor="#0284c7"
          text="Call (800) 555-0199"
          onClick={handleCallEmergency}
          style={{ fontSize: "13px", fontWeight: "600" }}
        />
        <UI.Button
          id="patientPortalBtn"
          position={{ x: 955, y: 30 }}
          size={{ width: 180, height: 44 }}
          variant="outline"
          color="#0284c7"
          text="Online Patient Portal"
          onClick={() => alert("Navigating to MyHopeWell Patient Portal...")}
          style={{ fontSize: "13px", borderColor: "#38bdf8" }}
        />
      </UI.ParentPanel>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          FOOTER
      â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <UI.Divider
        id="footerDivider"
        position={{ x: 60, y: 1205 }}
        size={{ width: 1160, height: 12 }}
        color="#e2e8f0"
      />

      <UI.Icon
        id="footerLogo"
        position={{ x: 60, y: 1232 }}
        size={{ width: 28, height: 28 }}
        name="heart"
        color="#0284c7"
        sizeProp={22}
      />
      <UI.Heading
        id="footerTitle"
        position={{ x: 96, y: 1230 }}
        size={{ width: 260, height: 32 }}
        level={4}
        text="HopeWell Health System"
        color="#0f172a"
        fontSize={16}
        fontWeight={700}
      />
      <UI.Paragraph
        id="footerAddress"
        position={{ x: 60, y: 1266 }}
        size={{ width: 550, height: 24 }}
        text="742 Medical Center Blvd, Suite 100, New York, NY 10021 â€¢ (800) 555-0199"
        color="#64748b"
        fontSize={13}
      />
      <UI.Text
        id="footerCopy"
        position={{ x: 60, y: 1294 }}
        size={{ width: 420, height: 22 }}
        text="Â© 2026 HopeWell Health System. All rights reserved."
        color="#94a3b8"
        fontSize={12}
      />

      {/* 24/7 Department Status Pill */}
      <UI.Badge
        id="footerErStatus"
        position={{ x: 885, y: 1232 }}
        size={{ width: 235, height: 28 }}
        variant="success"
        text="â— EMERGENCY DEPT: OPEN 24/7"
        fontSize={11}
        fontWeight={700}
      />

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          STUDIO EDIT TOOLS (Only visible when user toggles edit mode)
      â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!deployMode && <UI.MasterPanel position="top-right" />}
      {!deployMode && <UI.ExportPanel />}
      {!deployMode && <UI.InspectorPanel position="bottom-left" />}
    </UI.Canvas>
  );
}
