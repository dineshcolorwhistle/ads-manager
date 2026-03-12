import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Platforms from './pages/Platforms';
import DraftList from './pages/Drafts/DraftList';
import CampaignForm from './pages/Drafts/CampaignForm';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ApiSettings from './pages/Settings/ApiSettings';
import AdminClients from './pages/Admin/AdminClients';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * Main App Component
 * Sets up routing and layout
 */
function App() {
    return (
        <Layout>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Protected Routes */}
                <Route path="/" element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                } />
                <Route path="/platforms" element={
                    <ProtectedRoute>
                        <Platforms />
                    </ProtectedRoute>
                } />
                <Route path="/drafts" element={
                    <ProtectedRoute>
                        <DraftList />
                    </ProtectedRoute>
                } />
                <Route path="/drafts/new" element={
                    <ProtectedRoute>
                        <CampaignForm />
                    </ProtectedRoute>
                } />
                <Route path="/drafts/:id" element={
                    <ProtectedRoute>
                        <CampaignForm />
                    </ProtectedRoute>
                } />
                <Route path="/settings/api" element={
                    <ProtectedRoute>
                        <ApiSettings />
                    </ProtectedRoute>
                } />
                <Route path="/admin/clients" element={
                    <ProtectedRoute>
                        <AdminClients />
                    </ProtectedRoute>
                } />

                {/* Redirect unknown routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    );
}

export default App;
