import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4 sm:p-8">
      <div className="p-4 rounded-2xl bg-gray-100 mb-6">
        <Construction size={40} className="text-gray-400" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm text-gray-500 max-w-md">{description}</p>
      <div className="mt-6 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
        Under Development
      </div>
    </div>
  );
}
