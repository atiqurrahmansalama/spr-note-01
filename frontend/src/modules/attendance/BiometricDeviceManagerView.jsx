import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { FingerprintIcon, RefreshIcon, SaveIcon, TrashIcon, CloseIcon, SettingsIcon } from "../../components/ui/Icons";

export default function BiometricDeviceManagerView() {
  const { showToast } = useToast();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pingingId, setPingingId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({
    device_name: "",
    device_serial: "",
    device_ip: "",
    port: 4370,
    device_type: "ZKTECO",
    location: "Main Gate",
    api_key_or_token: "",
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/attendance/devices/");
      setDevices(res?.results || (Array.isArray(res) ? res : []));
    } catch (err) {
      showToast(err.message || "Failed to load biometric devices", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleOpenAdd = () => {
    setEditingDevice(null);
    setFormData({
      device_name: "",
      device_serial: "",
      device_ip: "",
      port: 4370,
      device_type: "ZKTECO",
      location: "Main Entrance",
      api_key_or_token: "",
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dev) => {
    setEditingDevice(dev);
    setFormData({
      device_name: dev.device_name,
      device_serial: dev.device_serial,
      device_ip: dev.device_ip || "",
      port: dev.port || 4370,
      device_type: dev.device_type || "ZKTECO",
      location: dev.location || "",
      api_key_or_token: dev.api_key_or_token || "",
      is_active: dev.is_active
    });
    setIsModalOpen(true);
  };

  const handleSaveDevice = async (e) => {
    e.preventDefault();
    if (!formData.device_name.trim() || !formData.device_serial.trim()) {
      showToast("Device Name and Serial Number are required.", "warning");
      return;
    }

    setSaving(true);
    try {
      if (editingDevice) {
        await fetchWithAuth(`/attendance/devices/${editingDevice.id}/`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        showToast("Biometric device updated successfully.", "success");
      } else {
        await fetchWithAuth("/attendance/devices/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        showToast("Biometric device registered successfully.", "success");
      }
      setIsModalOpen(false);
      fetchDevices();
    } catch (err) {
      showToast(err.message || "Failed to save device.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDevice = async (id) => {
    if (!window.confirm("Are you sure you want to remove this biometric device?")) return;
    try {
      await fetchWithAuth(`/attendance/devices/${id}/`, { method: "DELETE" });
      showToast("Device removed.", "success");
      fetchDevices();
    } catch (err) {
      showToast(err.message || "Failed to delete device.", "error");
    }
  };

  // Ping test device
  const handlePingDevice = async (id) => {
    setPingingId(id);
    try {
      const res = await fetchWithAuth(`/attendance/devices/${id}/ping/`, { method: "POST" });
      showToast(`Device ${res.device_name} responded Online. Heartbeat recorded.`, "success");
      fetchDevices();
    } catch (err) {
      showToast(err.message || "Device ping failed.", "error");
    } finally {
      setPingingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full theme-bg-app theme-text-primary">
      {/* Top Banner */}
      <div className="p-4 border-b theme-border flex flex-wrap items-center justify-between gap-4 theme-bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center">
            <FingerprintIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Biometric Devices & IoT Gateway</h1>
            <p className="text-xs theme-text-secondary">
              Manage ZKTeco, Hikvision, RFID, and automated biometric attendance gateways.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDevices}
            disabled={loading}
            className="p-2 rounded-lg border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-secondary transition"
            title="Refresh Devices"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="text-xs px-3.5 py-2 rounded-lg font-bold theme-bg-accent text-white shadow-md hover:opacity-90 active:scale-95 flex items-center gap-1.5 transition"
          >
            <span>+ Add Device</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Devices Table on Left, API Webhook Push Info on Right */}
      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-auto">
        {/* Left 2 Cols: Devices Table */}
        <div className="lg:col-span-2 border theme-border rounded-2xl p-4 theme-bg-surface shadow-md flex flex-col">
          <h2 className="text-sm font-bold border-b theme-border pb-3 mb-3">Registered Devices ({devices.length})</h2>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <RefreshIcon className="w-5 h-5 animate-spin theme-accent" />
              </div>
            ) : devices.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 theme-text-secondary">
                <FingerprintIcon className="w-8 h-8 opacity-40" />
                <p className="text-xs font-semibold">No biometric devices configured yet.</p>
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b theme-border theme-bg-sub/70 font-bold theme-text-secondary text-[11px] uppercase">
                    <th className="p-2.5">Device Name</th>
                    <th className="p-2.5">Serial / IP</th>
                    <th className="p-2.5">Type & Location</th>
                    <th className="p-2.5">Heartbeat</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border font-sans">
                  {devices.map((dev) => {
                    const isOnline = dev.last_heartbeat && (new Date() - new Date(dev.last_heartbeat)) < 15 * 60 * 1000;
                    return (
                      <tr key={dev.id} className="hover:theme-bg-elevated/40 transition">
                        <td className="p-2.5 font-bold theme-text-primary">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-neutral-500"}`} />
                            <span>{dev.device_name}</span>
                          </div>
                        </td>
                        <td className="p-2.5 font-mono text-[11px]">
                          <div>{dev.device_serial}</div>
                          {dev.device_ip && <div className="theme-text-secondary">{dev.device_ip}:{dev.port}</div>}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 theme-text-secondary border theme-border mr-1.5">
                            {dev.device_type_display || dev.device_type}
                          </span>
                          <span className="text-[11px] theme-text-secondary">{dev.location || "--"}</span>
                        </td>
                        <td className="p-2.5 font-mono text-[11px] theme-text-secondary">
                          {dev.last_heartbeat ? new Date(dev.last_heartbeat).toLocaleString() : "Never"}
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handlePingDevice(dev.id)}
                              disabled={pingingId === dev.id}
                              className="px-2 py-1 rounded-md border theme-border theme-bg-sub hover:theme-bg-elevated font-semibold text-[11px] text-emerald-400 transition"
                            >
                              {pingingId === dev.id ? "Pinging..." : "Ping Test"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(dev)}
                              className="p-1 rounded-md hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition"
                              title="Edit"
                            >
                              <SettingsIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDevice(dev.id)}
                              className="p-1 rounded-md hover:theme-bg-sub text-rose-400 hover:text-rose-300 transition"
                              title="Delete"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Col: Webhook Push API Documentation */}
        <div className="lg:col-span-1 border theme-border rounded-2xl p-4 theme-bg-surface shadow-md flex flex-col space-y-3 text-xs">
          <h2 className="text-sm font-bold border-b theme-border pb-2">IoT Gateway Webhook</h2>
          <p className="theme-text-secondary">
            Biometric devices & ADMS middleware can push attendance punches directly to this backend endpoint:
          </p>

          <div className="p-2.5 rounded-xl theme-bg-sub border theme-border font-mono text-[11px] text-emerald-400 select-all">
            POST /attendance/biometric/push/
          </div>

          <div className="space-y-1.5">
            <span className="font-bold theme-text-secondary">JSON Payload Sample:</span>
            <pre className="p-2.5 rounded-xl theme-bg-sub border theme-border font-mono text-[10px] theme-text-primary overflow-x-auto">
{`{
  "serial_number": "ZK-98823-GATE",
  "punches": [
    {
      "user_pin": "1001",
      "timestamp": "2026-08-16T08:15:30Z",
      "punch_type": "CHECK_IN"
    }
  ]
}`}
            </pre>
          </div>

          <p className="text-[11px] theme-text-secondary">
            The server automatically correlates the <code className="theme-accent">user_pin</code> with student roll numbers, ID card numbers, or teacher phone numbers, and records instant gate entries.
          </p>
        </div>
      </div>

      {/* Add / Edit Device Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="theme-bg-surface border theme-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b theme-border flex items-center justify-between">
              <h3 className="font-bold text-sm">{editingDevice ? "Edit Device" : "Register Biometric Device"}</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:theme-bg-sub theme-text-secondary"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 theme-text-secondary">Device Name</label>
                <input
                  type="text"
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  placeholder="e.g. Main Gate Biometric, Office Terminal"
                  className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1 theme-text-secondary">Serial Number</label>
                  <input
                    type="text"
                    value={formData.device_serial}
                    onChange={(e) => setFormData({ ...formData, device_serial: e.target.value })}
                    placeholder="e.g. ZK-98823-GATE"
                    className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 theme-text-secondary">Device Type</label>
                  <select
                    value={formData.device_type}
                    onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="ZKTECO">ZKTeco Biometric</option>
                    <option value="HIKVISION">Hikvision Terminal</option>
                    <option value="ANVIZ">Anviz Fingerprint</option>
                    <option value="RFID_GATE">RFID Barrier Gate</option>
                    <option value="REST_GATEWAY">REST Gateway</option>
                    <option value="OTHER">Other / Custom</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-semibold mb-1 theme-text-secondary">IP Address</label>
                  <input
                    type="text"
                    value={formData.device_ip}
                    onChange={(e) => setFormData({ ...formData, device_ip: e.target.value })}
                    placeholder="192.168.1.201"
                    className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 theme-text-secondary">Port</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value, 10) || 4370 })}
                    className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 theme-text-secondary">Physical Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Main Gate, Dormitory Entry, Staff Room"
                  className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border theme-border theme-bg-sub font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg font-bold theme-bg-accent text-white hover:opacity-90 transition"
                >
                  {saving ? "Saving..." : editingDevice ? "Update Device" : "Register Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
