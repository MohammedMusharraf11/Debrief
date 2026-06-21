import { Smile, Meh, Frown, CircleDotDashed } from "lucide-react";
import { cx, sentimentTone } from "@/lib/utils";

const icons = {
  positive: Smile,
  neutral: Meh,
  negative: Frown,
  mixed: CircleDotDashed,
};

export default function SentimentBadge({ sentiment, className }) {
  const Icon = icons[sentiment] || Meh;
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black capitalize ring-1", sentimentTone(sentiment), className)}>
      <Icon className="h-4 w-4" />
      {sentiment || "pending"}
    </span>
  );
}
