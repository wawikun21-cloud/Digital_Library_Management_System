import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout         from "./components/layout/Layout";
import Dashboard      from "./pages/Dashboard";
import Books          from "./pages/Books";
import Records        from "./pages/Records";
import Borrowed       from "./pages/Borrowed";
import RecentlyDeleted from "./pages/RecentlyDeleted";
import Login          from "./pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index                    element={<Dashboard />} />
          <Route path="books"             element={<Books />}     />
          <Route path="books/records"     element={<Records />}   />
          <Route path="borrowed"          element={<Borrowed />}  />
          <Route path="deleted"           element={<RecentlyDeleted />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}