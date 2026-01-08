import { useState, useEffect } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Loader2, Utensils } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "@/lib/api";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState({
    userName: 'User',
    calories: { consumed: 0, target: 2000 },
    protein: { consumed: 0, target: 150 },
    water: { consumed: 0, target: 3.0 },
    exercise: 0,
    streak: 0,
  });
  const [aiHint, setAiHint] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await API.getDashboard();
      
      const calorieTarget = data.calories?.target || 2000;
      const proteinTarget = Math.round((calorieTarget * 0.3) / 4);
      const waterTarget = 3.0;

      const consumed = data.calories?.eaten || 0;
      const proteinConsumed = data.macros?.protein || 0;
      const waterConsumed = data.water || 0;

      setTodayData({
        userName: data.user?.name || 'User',
        calories: { consumed, target: calorieTarget },
        protein: { consumed: Math.round(proteinConsumed), target: proteinTarget },
        water: { consumed: waterConsumed, target: waterTarget },
        exercise: data.calories?.burned || 0,
        streak: data.streak || 0,
      });

      // Generate AI hint
      const proteinPercent = (proteinConsumed / proteinTarget) * 100;
      const waterPercent = (waterConsumed / waterTarget) * 100;
      const caloriePercent = (consumed / calorieTarget) * 100;

      let hint: string | null = null;
      
      if (proteinPercent < 50 && caloriePercent > 20) {
        hint = 'Protein is low today — add curd, eggs, or dal.';
      } else if (waterPercent < 40 && caloriePercent > 20) {
        hint = 'Remember to stay hydrated — drink more water.';
      } else if (caloriePercent > 100) {
        hint = 'You have hit your calorie goal. Nice work!';
      } else if (caloriePercent < 20 && new Date().getHours() > 18) {
        hint = 'Log your evening meal to track your full day.';
      }

      setAiHint(hint);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = (): string => {
    const date = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const ProgressBar = ({ consumed, target }: { consumed: number; target: number }) => {
    const percent = Math.min((consumed / target) * 100, 100);
    const isLow = consumed < target * 0.3;
    
    return (
      <div className="h-1.5 bg-[#2A3038] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isLow ? 'bg-[#FB7185]' : 'bg-[#13ec80]'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F1419]">
        <Loader2 className="w-8 h-8 animate-spin text-[#13ec80]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1419] text-white pb-24">
      <div className="px-6 pt-16 pb-8 max-w-lg mx-auto">
        {/* Greeting + Date */}
        <div className="mb-8">
          <h1 className="text-xl font-medium text-white mb-1">
            {getGreeting()}, {todayData.userName.split(' ')[0]}
          </h1>
          <p className="text-sm text-[#6B7280]">{getFormattedDate()}</p>
        </div>

        {/* Today Summary Card */}
        <div className="bg-[#1A1F26] rounded-2xl p-5 mb-5">
          <h2 className="text-base font-semibold text-white mb-5">Today</h2>

          {/* Calories */}
          <div className="mb-5 pb-5 border-b border-[#2A3038]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#9CA3AF]">Calories</span>
              <div className="text-base font-semibold text-white">
                {todayData.calories.consumed}
                <span className="text-sm font-normal text-[#6B7280]">
                  {' '}/ {todayData.calories.target}
                </span>
              </div>
            </div>
            <ProgressBar consumed={todayData.calories.consumed} target={todayData.calories.target} />
          </div>

          {/* Protein */}
          <div className="mb-5 pb-5 border-b border-[#2A3038]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#9CA3AF]">Protein</span>
              <div className="text-base font-semibold text-white">
                {todayData.protein.consumed}g
                <span className="text-sm font-normal text-[#6B7280]">
                  {' '}/ {todayData.protein.target}g
                </span>
              </div>
            </div>
            <ProgressBar consumed={todayData.protein.consumed} target={todayData.protein.target} />
          </div>

          {/* Water */}
          <div className="mb-5 pb-5 border-b border-[#2A3038]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#9CA3AF]">Water</span>
              <div className="text-base font-semibold text-white">
                {todayData.water.consumed.toFixed(1)}L
                <span className="text-sm font-normal text-[#6B7280]">
                  {' '}/ {todayData.water.target.toFixed(1)}L
                </span>
              </div>
            </div>
            <ProgressBar consumed={todayData.water.consumed} target={todayData.water.target} />
          </div>

          {/* Exercise */}
          <div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#9CA3AF]">Exercise</span>
              <div className="text-base font-semibold text-white">
                {todayData.exercise}
                <span className="text-sm font-normal text-[#6B7280]"> kcal burned</span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <Button
          onClick={() => navigate('/coach')}
          className="w-full bg-[#13ec80] hover:bg-[#0fb863] text-[#0F1419] font-semibold rounded-xl h-12 mb-4 text-base"
        >
          <Utensils className="w-5 h-5 mr-2" />
          Log Food
        </Button>

        {/* AI Hint */}
        {aiHint && (
          <div className="bg-[#1A1F26] rounded-xl p-4 mb-4 border-l-4 border-[#13ec80]">
            <p className="text-sm text-[#9CA3AF] leading-relaxed">{aiHint}</p>
          </div>
        )}

        {/* Streak */}
        {todayData.streak > 0 && (
          <div className="text-center mt-4">
            <p className="text-xs text-[#6B7280]">
              🔥 {todayData.streak}-day streak
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
