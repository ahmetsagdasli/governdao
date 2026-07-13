import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { ProposalDetail } from "./pages/ProposalDetail";
import { CreateProposal } from "./pages/CreateProposal";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/proposal/:proposalId" element={<ProposalDetail />} />
          <Route path="/create" element={<CreateProposal />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
