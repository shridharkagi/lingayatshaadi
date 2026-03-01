"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { MembershipPlan } from "@/types";

interface PlanEditModalProps {
  plan: MembershipPlan;
  onSave: (override: Partial<MembershipPlan> | null) => void;
  onClose: () => void;
}

export function PlanEditModal({ plan, onSave, onClose }: PlanEditModalProps) {
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(plan.price.toString());
  const [duration, setDuration] = useState(plan.duration.toString());
  const [features, setFeatures] = useState<string[]>(plan.features);
  const [popular, setPopular] = useState(!!plan.popular);

  useEffect(() => {
    setName(plan.name);
    setPrice(plan.price.toString());
    setDuration(plan.duration.toString());
    setFeatures([...plan.features]);
    setPopular(!!plan.popular);
  }, [plan]);

  const handleSave = () => {
    const priceNum = parseInt(price, 10) || 0;
    const durationNum = parseInt(duration, 10) || 1;
    onSave({
      name: name.trim(),
      price: priceNum,
      duration: durationNum,
      features: features.filter((f) => f.trim()),
      popular: popular,
    });
    onClose();
  };

  const handleReset = () => {
    onSave(null);
    onClose();
  };

  const addFeature = () => setFeatures((f) => [...f, ""]);
  const updateFeature = (i: number, v: string) =>
    setFeatures((f) => f.map((x, j) => (j === i ? v : x)));
  const removeFeature = (i: number) =>
    setFeatures((f) => f.filter((_, j) => j !== i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Edit Plan: {plan.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <Input
            label="Plan Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Basic, Premium"
          />
          <Input
            label="Price (₹)"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0 for free"
          />
          <Input
            label="Duration (months)"
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
            <div className="space-y-2">
              {features.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={f}
                    onChange={(e) => updateFeature(i, e.target.value)}
                    placeholder="e.g. View 5 profiles/day, 10 contacts allowed"
                    className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(i)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addFeature}
                className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
              >
                <Plus size={16} />
                Add feature
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={popular}
              onChange={(e) => setPopular(e.target.checked)}
              className="rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="text-sm font-medium text-gray-700">Mark as Most Popular</span>
          </label>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-[var(--border)] px-6 py-4 flex gap-3">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            Reset to Default
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
