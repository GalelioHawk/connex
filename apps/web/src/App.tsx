import { Routes, Route } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EduHomePage from './pages/EduHomePage';
import TutorDashboardPage from './pages/TutorDashboardPage';
import MyBookingsPage from './pages/MyBookingsPage';
import BookingDetailPage from './pages/BookingDetailPage';
import CreateBookingPage from './pages/CreateBookingPage';
import StudentRosterPage from './pages/StudentRosterPage';
import HomeworkListPage from './pages/HomeworkListPage';
import HomeworkDetailPage from './pages/HomeworkDetailPage';
import AssignHomeworkPage from './pages/AssignHomeworkPage';
import MarkHomeworkPage from './pages/MarkHomeworkPage';
import StudentLedgerPage from './pages/StudentLedgerPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/edu" element={<RequireAuth><EduHomePage /></RequireAuth>} />
      <Route path="/tutoring" element={<RequireAuth><TutorDashboardPage /></RequireAuth>} />
      <Route path="/tutoring/bookings" element={<RequireAuth><MyBookingsPage /></RequireAuth>} />
      <Route path="/tutoring/bookings/new" element={<RequireAuth><CreateBookingPage /></RequireAuth>} />
      <Route path="/tutoring/bookings/:bookingId" element={<RequireAuth><BookingDetailPage /></RequireAuth>} />
      <Route path="/tutoring/students" element={<RequireAuth><StudentRosterPage /></RequireAuth>} />
      <Route path="/tutoring/homework" element={<RequireAuth><HomeworkListPage /></RequireAuth>} />
      <Route path="/tutoring/homework/new" element={<RequireAuth><AssignHomeworkPage /></RequireAuth>} />
      <Route path="/tutoring/homework/:assignmentId" element={<RequireAuth><HomeworkDetailPage /></RequireAuth>} />
      <Route path="/tutoring/homework/:assignmentId/mark" element={<RequireAuth><MarkHomeworkPage /></RequireAuth>} />
      <Route path="/tutoring/ledger/:studentId" element={<RequireAuth><StudentLedgerPage /></RequireAuth>} />
    </Routes>
  );
}
