import React, { useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import dietData from '../data/dietPlans.json';
import workoutData from '../data/workoutPlans.json';

const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6'];

function round(n:number, d=0){ const p=Math.pow(10,d); return Math.round(n*p)/p; }
const activityFactors: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very: 1.9 };
function mifflin(sex:'male'|'female', weightKg:number, heightCm:number, age:number){
  const base = 10*weightKg + 6.25*heightCm - 5*age; return sex==='male'? base+5 : base-161;
}
function adjustCalories(tdee:number, goal:string){
  if(goal==='fat_loss') return tdee*0.8;
  if(goal==='muscle_gain') return tdee*1.15;
  if(goal==='endurance') return tdee*1.05;
  return tdee;
}

export default function Home(){
  const [tab, setTab] = useState<'meals'|'workouts'|'notes'>('meals');
  const [form, setForm] = useState({
    name:'', age:30, sex:'male' as 'male'|'female', heightCm:175, weightKg:75,
    activity:'moderate', goal:'muscle_gain',
    dietCategory:'balanced', mealsPerDay:4,
    allergies:'', equipment:'mixed', daysPerWeek:4
  });

  const bmr = useMemo(()=> mifflin(form.sex as any, form.weightKg, form.heightCm, form.age), [form]);
  const tdee = useMemo(()=> bmr * activityFactors[form.activity], [bmr, form.activity]);
  const calories = useMemo(()=> adjustCalories(tdee, form.goal), [tdee, form.goal]);

  const macroSplit = useMemo(()=>{
    const proteinPerKg = form.goal==='muscle_gain'? 2.0 : form.goal==='fat_loss'? 1.8 : 1.6;
    const proteinG = proteinPerKg * form.weightKg;
    const fatKcal = form.goal==='endurance'? calories*0.20 : calories*0.25;
    const fatG = fatKcal/9;
    const carbKcal = Math.max(calories - proteinG*4 - fatKcal, 0);
    const carbsG = carbKcal/4;
    return { proteinG, carbsG, fatG };
  }, [calories, form.weightKg, form.goal]);

  const captureRef = useRef<HTMLDivElement|null>(null);
  const exportPDF = async ()=>{
    if(!captureRef.current) return;
    const canvas = await html2canvas(captureRef.current,{scale:2});
    const img=canvas.toDataURL('image/png');
    const pdf=new jsPDF({orientation:'p',unit:'pt',format:'a4'});
    const pw = pdf.internal.pageSize.getWidth();
    const iw = pw-40; const ih = canvas.height * (iw/canvas.width);
    pdf.addImage(img,'PNG',20,20,iw,ih); pdf.save('fitness-plan.pdf');
  };

  const allergens = useMemo(()=> form.allergies.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean), [form.allergies]);
  const meals = (dietData as any).meals.filter((m:any)=> m.category===form.dietCategory)
    .filter((m:any)=> !m.allergens.some((a:string)=> allergens.includes(a)));

  const workouts = (workoutData as any).workouts;

  const weeklyMeals = useMemo(()=>{
    const perDay = Math.max(3, Math.min(6, form.mealsPerDay));
    const out:any[] = [];
    for(let d=0; d<7; d++){
      const start = (d*perDay) % meals.length;
      const day = meals.slice(start, start+perDay);
      if(day.length<perDay){
        day.push(...meals.slice(0, perDay - day.length));
      }
      out.push(day);
    }
    return out;
  }, [meals, form.mealsPerDay]);

  const totals = (items:any[])=> items.reduce((acc:any, m:any)=>({cal:acc.cal+(m.calories||0), p:acc.p+(m.macros?.protein||0), c:acc.c+(m.macros?.carbs||0), f:acc.f+(m.macros?.fat||0)}), {cal:0,p:0,c:0,f:0});

  return (
    <>
      <Head><title>OneStop Fitness — Rich Planner</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div className="container" ref={captureRef}>
        <h1>🏋️ OneStop Fitness — Planner</h1>
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{marginTop:0}}>Inputs</h3>
            <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
              <div><label>Name</label><input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="Your name"/></div>
              <div><label>Age</label><input type="number" value={form.age} onChange={e=>setForm({...form, age:Number(e.target.value)})}/></div>
              <div><label>Height (cm)</label><input type="number" value={form.heightCm} onChange={e=>setForm({...form, heightCm:Number(e.target.value)})}/></div>
              <div><label>Weight (kg)</label><input type="number" value={form.weightKg} onChange={e=>setForm({...form, weightKg:Number(e.target.value)})}/></div>
              <div><label>Sex</label>
                <select value={form.sex} onChange={e=>setForm({...form, sex:e.target.value as any})}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div><label>Activity</label>
                <select value={form.activity} onChange={e=>setForm({...form, activity:e.target.value})}>
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light (1–3 d/wk)</option>
                  <option value="moderate">Moderate (3–5 d/wk)</option>
                  <option value="active">Active (6–7 d/wk)</option>
                  <option value="very">Very Active</option>
                </select>
              </div>
              <div><label>Goal</label>
                <select value={form.goal} onChange={e=>setForm({...form, goal:e.target.value})}>
                  <option value="fat_loss">Fat Loss</option>
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="general_fitness">General Fitness</option>
                  <option value="endurance">Endurance</option>
                </select>
              </div>
              <div><label>Diet Category</label>
                <select value={form.dietCategory} onChange={e=>setForm({...form, dietCategory:e.target.value})}>
                  <option value="balanced">Balanced</option>
                  <option value="vegetarian">Indian Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="nonVegetarian">Non-Vegetarian (Chicken/Fish/Eggs)</option>
                  <option value="snacks">Snacks</option>
                </select>
              </div>
              <div><label>Meals per day</label><input type="number" min={3} max={6} value={form.mealsPerDay} onChange={e=>setForm({...form, mealsPerDay:Number(e.target.value)})}/></div>
              <div><label>Allergies (comma separated)</label><input placeholder="e.g., dairy, gluten, peanuts" value={form.allergies} onChange={e=>setForm({...form, allergies:e.target.value})}/></div>
              <div><label>Days/Week</label><input type="number" min={1} max={6} value={form.daysPerWeek} onChange={e=>setForm({...form, daysPerWeek:Number(e.target.value)})}/></div>
              <div><label>Equipment</label>
                <select value={form.equipment} onChange={e=>setForm({...form, equipment:e.target.value})}>
                  <option value="none">None</option>
                  <option value="basic">Basic (DB/Bands)</option>
                  <option value="mixed">Mixed</option>
                  <option value="full_gym">Full Gym</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex', gap:10, marginTop:12}}>
              <button onClick={exportPDF}>Export PDF</button>
              <button className="secondary" onClick={()=>window.scrollTo({top:0, behavior:'smooth'})}>Top</button>
            </div>
          </div>

          <div className="card">
            <h3 style={{marginTop:0}}>Targets</h3>
            <div className="grid" style={{gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
              <div className="kpi"><div className="label">BMR</div><div className="value">{round(bmr)} kcal</div></div>
              <div className="kpi"><div className="label">TDEE</div><div className="value">{round(tdee)} kcal</div></div>
              <div className="kpi"><div className="label">Daily Calories</div><div className="value">{round(calories)} kcal</div></div>
              <div className="kpi"><div className="label">Macros</div><div className="value">{round(macroSplit.proteinG)}P / {round(macroSplit.carbsG)}C / {round(macroSplit.fatG)}F</div></div>
            </div>

            <div className="grid" style={{gridTemplateColumns:'1fr 1fr', marginTop:12, gap:12}}>
              <div style={{height:260}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="value" data={[
                      {name:'Protein', value: round(macroSplit.proteinG)},
                      {name:'Carbs', value: round(macroSplit.carbsG)},
                      {name:'Fat', value: round(macroSplit.fatG)},
                    ]} outerRadius={90} label>
                      {[0,1,2].map(i=> <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{height:260}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    {name:'Protein (g)', value: round(macroSplit.proteinG)},
                    {name:'Carbs (g)', value: round(macroSplit.carbsG)},
                    {name:'Fat (g)', value: round(macroSplit.fatG)},
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ReTooltip />
                    <Bar dataKey="value">
                      {[0,1,2].map(i=> <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{marginTop:16}}>
          <div className="tabbar">
            <button className={tab==='meals'?'active':''} onClick={()=>setTab('meals')}>🥗 Meals</button>
            <button className={tab==='workouts'?'active':''} onClick={()=>setTab('workouts')}>🏋️ Workouts</button>
            <button className={tab==='notes'?'active':''} onClick={()=>setTab('notes')}>📝 Notes</button>
          </div>

          {tab==='meals' && (
            <div style={{marginTop:12}}>
              {weeklyMeals.map((day, idx)=>{
                const t = totals(day);
                return (
                  <div key={idx} className="item">
                    <div className="row" style={{justifyContent:'space-between'}}>
                      <div className="badge">Day {idx+1}</div>
                      <div className="row">
                        <span className="badge">Total: {round(t.cal)} kcal</span>
                        <span className="badge" style={{marginLeft:8}}>{round(t.p)}P / {round(t.c)}C / {round(t.f)}F</span>
                      </div>
                    </div>
                    <table className="table" style={{marginTop:8}}>
                      <thead><tr><th>Meal</th><th>Item</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fat</th><th>Link</th></tr></thead>
                      <tbody>
                        {day.map((m:any, i:number)=>(
                          <tr key={i}>
                            <td>{m.mealType}</td>
                            <td>{m.name}</td>
                            <td>{m.calories}</td>
                            <td>{m.macros?.protein}</td>
                            <td>{m.macros?.carbs}</td>
                            <td>{m.macros?.fat}</td>
                            <td>{m.link? <a href={m.link} target="_blank" rel="noreferrer">Recipe</a> : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          )}

          {tab==='workouts' && (
            <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginTop:12}}>
              {workouts.slice(0, 240).map((w:any, i:number)=>(
                <div key={i} className="item">
                  <div className="row" style={{justifyContent:'space-between'}}>
                    <div className="badge">{w.type}</div>
                    <div className="badge">{w.muscle || 'full body'}</div>
                  </div>
                  <div style={{fontWeight:700, margin:'6px 0'}}>{w.name}</div>
                  <div style={{fontSize:13, color:'#a3a3a3'}}>Sets/Reps: {w.sets? `${w.sets} x ${w.reps}` : (w.duration || '-')} • Intensity: {w.intensity || '-'}</div>
                  <div style={{fontSize:13, color:'#a3a3a3'}}>Equipment: {w.equipment || '—'}</div>
                  {w.link && <div style={{marginTop:6}}><a href={w.link} target="_blank" rel="noreferrer">Learn more</a></div>}
                </div>
              ))}
            </div>
          )}

          {tab==='notes' && (
            <div style={{marginTop:12}}>
              <ul>
                <li>Distribute protein across meals (25–45 g each).</li>
                <li>Strength days: RPE 7–9, leave 1–2 reps in reserve.</li>
                <li>HIIT 1–2x/week; Zone 2 cardio 2–3x/week.</li>
                <li>Hydration: 30–40 ml/kg/day; include electrolytes in heat.</li>
                <li>Supplements: Whey/Plant protein, creatine 3–5 g/day, Vitamin D per labs, fish oil for EPA/DHA.</li>
              </ul>
            </div>
          )}
        </div>

        <footer>Built for Vercel • Next.js 14 • Recharts • © 2025 OneStop Fitness</footer>
      </div>
    </>
  );
}
