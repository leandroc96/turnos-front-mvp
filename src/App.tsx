import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Layout";
import { AppointmentsPage, DoctorsPage, StudiesPage, BillingPage, ObrasSocialesPage, TarifasPage } from "./pages";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main">
          <Routes>
            <Route path="/" element={<AppointmentsPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/studies" element={<StudiesPage />} />
            <Route path="/obras-sociales" element={<ObrasSocialesPage />} />
            <Route path="/tarifas" element={<TarifasPage />} />
            <Route path="/facturacion" element={<BillingPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
