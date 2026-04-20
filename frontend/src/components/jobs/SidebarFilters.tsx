import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function SidebarFilters() {
  const sections = [
    { title: "Work Type", options: ["Full Time", "Part Time", "Contract", "Internship"] },
    { title: "AI Match Score", options: ["High Match", "Moderate Match", "Show All"] },
    { title: "Work Environment", options: ["On-site", "Remote", "Hybrid"] },
    { title: "Sort By", options: ["Most Recent", "Highest Salary", "Best AI Match"] },
  ];

  return (
    <div className="w-full bg-[#0F9DE4]/15 p-6 rounded-[16px] border border-[#0F9DE4]/20">
      <h3 className="font-semibold text-gray-900 mb-6 pb-2 border-b border-[#0F9DE4]/20">
        Refine Your Search
      </h3>

      {sections.map((sec) => (
        <div key={sec.title} className="mb-8 last:mb-0">
          <p className="text-sm font-semibold text-gray-800 mb-4 uppercase tracking-tight">
            {sec.title}
          </p>

          <div className="grid grid-cols-2 gap-3
          3">
            {sec.options.map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <Checkbox
                  id={opt}
                  className="border-gray-300 data-[state=checked]:bg-blue-600"
                />
                <Label
                  htmlFor={opt}
                  className="text-xs text-gray-600 font-medium cursor-pointer leading-none"
                >
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}