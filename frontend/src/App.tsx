import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import StaffGate from "@/components/StaffGate";
import Home from "@/pages/Home";
import TableMenu from "@/pages/TableMenu";
import OrderStatus from "@/pages/OrderStatus";
import StaffBoard from "@/pages/StaffBoard";
import StaffTables from "@/pages/StaffTables";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/table/:tableId" element={<TableMenu />} />
        <Route path="/takeout" element={<TableMenu />} />
        <Route path="/status/:orderId" element={<OrderStatus />} />
        <Route
          path="/staff"
          element={
            <StaffGate>
              <StaffBoard />
            </StaffGate>
          }
        />
        <Route
          path="/staff/tables"
          element={
            <StaffGate>
              <StaffTables />
            </StaffGate>
          }
        />
      </Routes>
      <Toaster position="top-center" richColors />
    </>
  );
}
