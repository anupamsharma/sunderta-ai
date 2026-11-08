import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Nav from './components/Nav';
import { RequireInviteeSession } from './components/RequireInviteeSession';
import Landing from './pages/Landing';
import Analysis from './pages/Analysis';
import Processing from './pages/Processing';
import Report from './pages/Report';
import Assistant from './pages/Assistant';
import History from './pages/History';
import Routine from './pages/Routine';
import Products from './pages/Products';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AccessLogin from './pages/AccessLogin';

function GatedLayout() {
  return (
    <RequireInviteeSession>
      <Outlet />
    </RequireInviteeSession>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isPublic =
    location.pathname === '/admin' ||
    location.pathname.startsWith('/access/');
  const hideNav = location.pathname === '/analysis/processing' || isPublic;

  return (
    <>
      {!hideNav && <Nav />}
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/access/:token" element={<AccessLogin />} />
        <Route element={<GatedLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/analysis/processing" element={<Processing />} />
          <Route path="/report" element={<Report />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/history" element={<History />} />
          <Route path="/routine" element={<Routine />} />
          <Route path="/products" element={<Products />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Landing />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
