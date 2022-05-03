import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  NavLink,
} from "react-router-dom";
import Transactions from "../../pages/Transactions/transactions";
import Overview from "../../pages/Overview/overview";
import { Tabs } from "../../constants/tabs";
import logo from "../../images/Logo.png";
import "./sidebar.css";

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState("Transactions");

  const onClick = (tab) => () => {
    setActiveTab(tab);
  };
  useEffect(() => {}, [activeTab]);

  return (
    <>
      <Router>
        <div className="sideBarWrapper">
          <div className="sideBar">
            <div className="sideBarLogo">
              <Link to="/">
                <img
                  src={logo}
                  alt="logo"
                  className="logo cursor-pointer"
                  width="40"
                  height="32"
                />
              </Link>
            </div>
            <div className="sideBarLinks uppercase text-base">
              {Tabs.map(({ tabName, pathName, icon }) => (
                <NavLink
                  className="pt-8 navLink"
                  to={pathName}
                  key={tabName}
                  activeClassName="active"
                  onClick={onClick(tabName)}
                >
                  {icon}
                  {tabName}
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<Transactions />} />
          <Route path="/overview" element={<Overview />} />
        </Routes>
      </Router>
    </>
  );
};

export default Sidebar;
