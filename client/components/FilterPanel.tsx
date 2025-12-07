import { useState, useRef, useEffect } from "react";
import { type Farm } from "@/lib/firebase";
import { ChevronDown, X } from "lucide-react";

interface FilterPanelProps {
  farms: Farm[];
  selectedFarms: string[];
  onFarmsChange: (farms: string[]) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
}

export default function FilterPanel({
  farms,
  selectedFarms,
  onFarmsChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}: FilterPanelProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleFarmToggle = (farmId: string) => {
    if (selectedFarms.includes(farmId)) {
      onFarmsChange(selectedFarms.filter((id) => id !== farmId));
    } else {
      onFarmsChange([...selectedFarms, farmId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedFarms.length === farms.length) {
      onFarmsChange([]);
    } else {
      onFarmsChange(farms.map((f) => f.id));
    }
  };

  const getSelectedFarmNames = () => {
    return selectedFarms
      .map((id) => farms.find((f) => f.id === id)?.nom)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card">
      <div className="space-y-6">
        {/* Date Range Filter */}
        <div>
          <h3 className="text-lg font-semibold text-primary mb-4">
            Filter by Date Range
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {/* Farm Filter Dropdown */}
        <div ref={dropdownRef}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">
              Filter by Farms
            </h3>
            {selectedFarms.length > 0 && (
              <button
                onClick={() => onFarmsChange([])}
                className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="relative">
            {/* Dropdown Trigger Button */}
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground flex items-center justify-between hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <span className="text-sm">
                {selectedFarms.length === 0
                  ? "Select farms..."
                  : selectedFarms.length === farms.length
                    ? "All farms selected"
                    : `${selectedFarms.length} farm${selectedFarms.length !== 1 ? "s" : ""} selected`}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Content */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="max-h-80 overflow-y-auto">
                  {/* Select All / Clear All Option */}
                  <div className="border-b border-border p-3">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedFarms.length === farms.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-border cursor-pointer accent-accent"
                      />
                      <span className="text-sm font-medium text-foreground">
                        {selectedFarms.length === farms.length
                          ? "Unselect All"
                          : "Select All"}
                      </span>
                    </label>
                  </div>

                  {/* Farm Options */}
                  <div className="p-2 space-y-1">
                    {farms.map((farm) => (
                      <label
                        key={farm.id}
                        className="flex items-center gap-2 cursor-pointer p-3 rounded hover:bg-muted transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFarms.includes(farm.id)}
                          onChange={() => handleFarmToggle(farm.id)}
                          className="w-4 h-4 rounded border-border cursor-pointer accent-accent"
                        />
                        <span className="text-sm text-foreground">{farm.nom}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selected Farms Tags */}
          {selectedFarms.length > 0 && selectedFarms.length < farms.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedFarms.map((farmId) => {
                const farm = farms.find((f) => f.id === farmId);
                return farm ? (
                  <div
                    key={farmId}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/30 rounded-full"
                  >
                    <span className="text-xs font-medium text-accent">
                      {farm.nom}
                    </span>
                    <button
                      onClick={() => handleFarmToggle(farmId)}
                      className="text-accent/60 hover:text-accent transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
