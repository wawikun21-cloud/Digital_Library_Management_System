/**
 * client/src/pages/StudentsDashboard.jsx
 * Students Dashboard - Interactive and modular design
 */

import { useState } from "react";
import { Users } from "lucide-react";
import SurigaoDelNorteMap from "../components/SurigaoDelNorteMap";
import {
  Card, C, KpiCards, FilterBar, FilterHeader, filterOptions,
  CourseDemandCard, FeederSchoolsCard, AttendanceInsightsCard,
  LocationVsCourseCard, EnrollmentTrendsCard, CourseGrowthTrendsCard,
  GenderDistributionCard, CourseDetailsModal, FeederSchoolsModal,
  AtRiskModal, LocationsModal
} from "../components/dashboard";

export default function StudentsDashboard() {
  const [filters, setFilters] = useState({
    semester: "All", course: "All", region: "All", municipality: "All",
    barangay: "All", feederSchool: "All", gender: "All", academicYear: "2024-2025",
  });

  const [modalType, setModalType] = useState(null);
  const [mapFilter, setMapFilter] = useState(null);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      semester: "All", course: "All", region: "All", municipality: "All",
      barangay: "All", feederSchool: "All", gender: "All", academicYear: "2024-2025",
    });
    setMapFilter(null);
  };

  const handleMapClick = (municipality) => {
    if (municipality?.name) {
      setMapFilter(municipality.name);
      updateFilter("municipality", municipality.name);
    }
  };

  const openModal = (type) => setModalType(type);
  const closeModal = () => setModalType(null);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 7 }}>
            <Users size={17} color={C.blue} /> Overview
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
            Summary of enrollment, attendance and student insights
            {mapFilter && <span style={{ color: C.blue, fontWeight: 600 }}> · {mapFilter}</span>}
          </p>
        </div>
        <FilterHeader
          filters={filters}
          updateFilter={updateFilter}
          handleClearFilters={handleClearFilters}
          mapFilter={mapFilter}
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        updateFilter={updateFilter}
        handleClearFilters={handleClearFilters}
        mapFilter={mapFilter}
      />

      {/* KPI Row */}
      <KpiCards />

      {/* Row 2: Map + Course Demand */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card title="Student Distribution Map" subtitle="Surigao del Norte · click a municipality">
          <SurigaoDelNorteMap onMunicipalityClick={handleMapClick} />
        </Card>
        <CourseDemandCard onOpenModal={openModal} />
      </div>

      {/* Row 3: Feeder + Attendance + Location */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.7fr) minmax(0,1fr)", gap: 14 }}>
        <FeederSchoolsCard onOpenModal={openModal} />
        <AttendanceInsightsCard onOpenModal={openModal} />
        <LocationVsCourseCard onOpenModal={openModal} />
      </div>

      {/* Row 4: Enrollment + Course Growth + Gender */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: 14 }}>
        <EnrollmentTrendsCard />
        <CourseGrowthTrendsCard />
        <GenderDistributionCard />
      </div>

      {/* Modals */}
      <CourseDetailsModal isOpen={modalType === "courseDetails"} onClose={closeModal} />
      <FeederSchoolsModal isOpen={modalType === "feederSchools"} onClose={closeModal} />
      <AtRiskModal isOpen={modalType === "atRisk"} onClose={closeModal} />
      <LocationsModal isOpen={modalType === "locations"} onClose={closeModal} />

    </main>
  );
}