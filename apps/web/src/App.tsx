import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";

function LoginPage() {
  return <h1>Login</h1>;
}

function RegisterPage() {
  return <h1>Register</h1>;
}





function NotFoundPage() {
  return <h1>Page Not Found</h1>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;