import React, { useState, useEffect } from "react";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  SparklesIcon,
  CloseIcon,
  CalendarIcon,
} from "../ui/Icons";
import { calendarEventKindsStore, calendarEventTypesStore } from "../../utils/localStore";
import { useTenant } from "../../context/TenantContext";
import { useToast } from "../../context/ToastContext";

export default function EventKindsInlineManager({ className = "", onKindsUpdated }) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();

  const [kinds, setKinds] = useState([]);
  const [typesList, setTypesList] = useState([]);

  // Adding state
  const [newLabel, setNewLabel] = useState("");

  // Editing state
  const [editingVal, setEditingVal] = useState(null);
  const [editLabel, setEditLabel] = useState("");

  // Deleting & Replacement State
  const [deletingKind, setDeletingKind] = useState(null);
  const [replacementVal, setReplacementVal] = useState("");

  const refreshKinds = () => {
    const kList = calendarEventKindsStore.getKinds(activeTenantId);
    const tList = calendarEventTypesStore.getEventTypes(activeTenantId);
    setKinds(kList || []);
    setTypesList(tList || []);
    if (onKindsUpdated) onKindsUpdated(kList);
  };

  useEffect(() => {
    refreshKinds();
  }, [activeTenantId]);

  // Handle Add
  const handleAddKind = (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    try {
      const added = calendarEventKindsStore.addKind(activeTenantId, {
        label: newLabel.trim(),
      });
      setNewLabel("");
      showToast(`Event Type "${added.label}" created successfully!`, "success");
      refreshKinds();
    } catch (err) {
      showToast("Failed to add event type", "error");
    }
  };

  // Start Edit
  const handleStartEdit = (k) => {
    setEditingVal(k.value);
    setEditLabel(k.label);
    setDeletingKind(null);
  };

  // Save Edit
  const handleSaveEdit = (oldVal) => {
    if (!editLabel.trim()) return;
    try {
      calendarEventKindsStore.updateKind(activeTenantId, oldVal, {
        label: editLabel.trim(),
      });
      setEditingVal(null);
      showToast(`Event Type updated successfully!`, "success");
      refreshKinds();
    } catch (err) {
      showToast("Failed to update event type", "error");
    }
  };

  // Start Delete prompt
  const handlePromptDelete = (k) => {
    const remaining = kinds.filter((item) => item.value !== k.value);
    if (remaining.length === 0) {
      showToast("Cannot delete the last remaining Event Type.", "warning");
      return;
    }
    setEditingVal(null);
    setDeletingKind(k);
    setReplacementVal(remaining[0].value);
  };

  // Confirm Delete with Replacement
  const handleConfirmDelete = () => {
    if (!deletingKind || !replacementVal) return;
    try {
      calendarEventKindsStore.deleteKind(activeTenantId, deletingKind.value, replacementVal);
      const repObj = kinds.find((k) => k.value === replacementVal);
      showToast(`Deleted "${deletingKind.label}". All linked events migrated to "${repObj?.label || replacementVal}".`, "info");
      setDeletingKind(null);
      refreshKinds();
    } catch (err) {
      showToast("Failed to delete event type", "error");
    }
  };
}
