import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout    from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Books     from "./pages/Books";
import Borrowed  from "./pages/Borrowed";
import RecentlyDeleted from "./pages/RecentlyDeleted";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index           element={<Dashboard />} />
          <Route path="books"    element={<Books />}     />
          <Route path="borrowed" element={<Borrowed />}  />
          <Route path="deleted"  element={<RecentlyDeleted />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}