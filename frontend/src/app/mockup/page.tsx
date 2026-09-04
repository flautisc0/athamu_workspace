"use client";

import { useState } from "react";
import type { Project } from "./data";
import Topbar from "./components/Topbar";
import SideDrawer from "./components/SideDrawer";
import ProfileCard from "./components/ProfileCard";
import SociosGrid from "./components/SociosGrid";
import DashboardStats from "./components/DashboardStats";
import ProyectosList from "./components/ProyectosList";
import ProjectSheet from "./components/ProjectSheet";

export default function MockupPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100dvh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      <Topbar onMenuClick={() => setDrawerOpen(true)} />

      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main
        id="inicio"
        style={{
          flex: 1,
          overflowY: "auto",
          overscrollBehavior: "contain",
          paddingTop: "20px",
        }}
      >
        <ProfileCard />
        <SociosGrid />
        <DashboardStats />
        <ProyectosList onSelect={setSelectedProject} />
      </main>

      <ProjectSheet
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </div>
  );
}
