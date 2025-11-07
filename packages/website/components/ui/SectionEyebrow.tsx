type SectionEyebrowProps = {
  text: string;
  color: "blue" | "green" | "amber" | "purple";
  className?: string;
};

export function SectionEyebrow({ text, color, className = "" }: SectionEyebrowProps) {
  const colorMap = {
    blue: "to-blue-400",
    green: "to-green-400",
    amber: "to-amber-400",
    purple: "to-purple-400",
  };

  const gradientColor = colorMap[color];

  return (
    <div className={`inline-flex items-center gap-2 mb-4 ${className}`}>
      <div className={`h-px w-8 bg-gradient-to-r from-transparent ${gradientColor}`}></div>
      <span className="text-xs tracking-widest text-gray-500 uppercase">{text}</span>
      <div className={`h-px w-8 bg-gradient-to-l from-transparent ${gradientColor}`}></div>
    </div>
  );
}
