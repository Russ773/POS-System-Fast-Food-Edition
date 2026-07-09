import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input } from "@pos/ui";
import { ApiError } from "@pos/shared";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/menu");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <Card className="login-card">
        <h1>POS Admin</h1>
        <form onSubmit={onSubmit} className="login-form">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="login-error">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
