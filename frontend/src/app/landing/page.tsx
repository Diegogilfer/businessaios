'use client'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const PLANS = [
  { id:'free',       name:'Free',       price:0,    color:'#555',    features:['50 tareas/mes','3 agentes','Chat 20 msgs/día'],             cta:'Empezar gratis' },
  { id:'starter',    name:'Starter',    price:29,   color:'#4af0c8', features:['500 tareas/mes','6 agentes','5 scans arbitraje','Webhooks'], cta:'Comenzar',      recommended:true },
  { id:'pro',        name:'Pro',        price:99,   color:'#c8f04a', features:['5.000 tareas','Todo ilimitado','Auto-Optimizer','Analytics'], cta:'Escalar a Pro' },
  { id:'enterprise', name:'Enterprise', price:null, color:'#c44af0', features:['Sin límites','Agentes custom','SLA','White-label'],           cta:'Contactar' },
]

const AGENTS = [
  {icon:'⬡',name:'CEO Agent',       color:'#c8f04a',desc:'Estrategia y decisiones ejecutivas'},
  {icon:'◈',name:'Research Agent',   color:'#4af0c8',desc:'Mercados, competidores y oportunidades'},
  {icon:'◆',name:'Commercial Agent', color:'#f0a44a',desc:'Ventas, funnels y conversión'},
  {icon:'◉',name:'Content Agent',    color:'#c44af0',desc:'Copy, contenido y marketing'},
  {icon:'◇',name:'Finance Agent',    color:'#4a9cf0',desc:'Proyecciones y unit economics'},
  {icon:'◎',name:'Operations Agent', color:'#f04a6c',desc:'Procesos, OKRs y automatización'},
]

export default function LandingPage() {
  const [form,    setForm]    = useState({name:'',email:'',plan:'starter',company:''})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<Record<string,unknown>|null>(null)
  const [error,   setError]   = useState('')

  async function register() {
    if (!form.name || !form.email) return
    setLoading(true); setError('')
    try {
      const r    = await fetch(`${API}/onboarding/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Error')
      setSuccess(data)
    } catch(e:unknown){ setError(e instanceof Error ? e.message : 'Error') }
    setLoading(false)
  }

  const inp:React.CSSProperties = { width:'100%', background:'#0a0a0a', border:'1px solid #1e1e1e', color:'#ccc', padding:'12px 16px', borderRadius:3, fontSize:14, outline:'none', fontFamily:'inherit', transition:'border-color .2s' }

  return (
    <div style={{background:'#060606',minHeight:'100vh',color:'#ccc',fontFamily:"'IBM Plex Sans','Helvetica Neue',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600;700&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>

      {/* HERO */}
      <div style={{padding:'80px 24px 60px',textAlign:'center',borderBottom:'1px solid #0e0e0e',background:'radial-gradient(ellipse at 50% 0%,#c8f04a08 0%,transparent 60%)'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,marginBottom:24,padding:'5px 14px',background:'#c8f04a10',border:'1px solid #c8f04a28',borderRadius:20}}>
          <span style={{color:'#c8f04a'}}>⬡</span>
          <span style={{fontSize:10,color:'#c8f04a',letterSpacing:'0.12em',textTransform:'uppercase'}}>BusinessAIOS v1.3.0</span>
        </div>
        <h1 style={{fontSize:clamp(32,52),fontWeight:700,color:'#fff',letterSpacing:'-0.03em',lineHeight:1.1,marginBottom:16}}>
          Tu empresa dirigida por<br/><span style={{color:'#c8f04a'}}>6 agentes de IA</span>
        </h1>
        <p style={{fontSize:17,color:'#555',maxWidth:540,margin:'0 auto 36px',lineHeight:1.7}}>
          Análisis, estrategia, ventas, contenido, finanzas y operaciones automatizadas. Plataforma SaaS lista para producción.
        </p>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <a href="#registro" style={{background:'#c8f04a',color:'#000',padding:'13px 28px',borderRadius:3,fontSize:13,fontWeight:700,textDecoration:'none',letterSpacing:'0.06em',textTransform:'uppercase'}}>Empezar gratis →</a>
          <a href="/docs" style={{background:'transparent',color:'#ccc',padding:'13px 28px',borderRadius:3,fontSize:13,border:'1px solid #1e1e1e',textDecoration:'none',letterSpacing:'0.06em',textTransform:'uppercase'}}>API docs</a>
        </div>
      </div>

      {/* AGENTES */}
      <div style={{padding:'52px 24px',maxWidth:1000,margin:'0 auto'}}>
        <p style={{fontSize:10,color:'#333',textTransform:'uppercase',letterSpacing:'0.12em',textAlign:'center',marginBottom:28}}>6 agentes especializados · trabajan en equipo</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {AGENTS.map(ag=>(
            <div key={ag.name} style={{background:'#0d0d0d',border:`1px solid ${ag.color}18`,borderTop:`2px solid ${ag.color}`,borderRadius:3,padding:'16px 18px',display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:20,color:ag.color,flexShrink:0}}>{ag.icon}</span>
              <div>
                <p style={{fontSize:12,fontWeight:600,color:'#ddd',margin:'0 0 2px'}}>{ag.name}</p>
                <p style={{fontSize:10,color:'#444'}}>{ag.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PLANES + REGISTRO */}
      <div id="registro" style={{padding:'0 24px 60px',maxWidth:1000,margin:'0 auto'}}>
        <p style={{fontSize:10,color:'#333',textTransform:'uppercase',letterSpacing:'0.12em',textAlign:'center',marginBottom:28}}>Planes y precios</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:36}}>
          {PLANS.map(plan=>(
            <div key={plan.id} style={{background:'#0d0d0d',border:plan.recommended?`1px solid ${plan.color}`:`1px solid ${plan.color}20`,borderTop:`2px solid ${plan.color}`,borderRadius:3,padding:18,position:'relative'}}>
              {plan.recommended&&<span style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',fontSize:8,padding:'2px 10px',borderRadius:20,background:plan.color,color:'#000',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',whiteSpace:'nowrap'}}>Recomendado</span>}
              <p style={{fontSize:14,fontWeight:700,color:'#eee',margin:'0 0 4px',textTransform:'capitalize'}}>{plan.name}</p>
              <p style={{fontSize:24,fontWeight:700,color:plan.color,fontFamily:'DM Mono,monospace',margin:'0 0 14px'}}>{plan.price===null?'Custom':plan.price===0?'Gratis':`$${plan.price}/mo`}</p>
              {plan.features.map(f=><p key={f} style={{fontSize:10,color:'#555',margin:'4px 0',display:'flex',gap:5}}><span style={{color:plan.color}}>✓</span>{f}</p>)}
              <button onClick={()=>setForm(f=>({...f,plan:plan.id}))} style={{marginTop:14,width:'100%',background:`${plan.color}15`,border:`1px solid ${plan.color}35`,color:plan.color,padding:'8px',borderRadius:3,fontSize:10,fontWeight:700,cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.06em',fontFamily:'inherit'}}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Formulario */}
        <div style={{maxWidth:440,margin:'0 auto'}}>
          {!success?(
            <div style={{background:'#0d0d0d',border:'1px solid #1a1a1a',borderRadius:3,padding:26}}>
              <p style={{fontSize:10,color:'#333',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:18,textAlign:'center'}}>
                Crear cuenta — Plan {form.plan.charAt(0).toUpperCase()+form.plan.slice(1)}
              </p>
              <div style={{display:'grid',gap:10}}>
                <input style={inp} placeholder="Tu nombre" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} onFocus={e=>(e.target.style.borderColor='#c8f04a')} onBlur={e=>(e.target.style.borderColor='#1e1e1e')}/>
                <input style={inp} placeholder="Email" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} onFocus={e=>(e.target.style.borderColor='#c8f04a')} onBlur={e=>(e.target.style.borderColor='#1e1e1e')}/>
                <input style={inp} placeholder="Empresa (opcional)" value={form.company} onChange={e=>setForm(f=>({...f,company:e.target.value}))} onFocus={e=>(e.target.style.borderColor='#c8f04a')} onBlur={e=>(e.target.style.borderColor='#1e1e1e')}/>
                {error&&<p style={{fontSize:11,color:'#f04a6c',fontFamily:'monospace'}}>{error}</p>}
                <button onClick={register} disabled={loading||!form.name||!form.email} style={{background:(loading||!form.name||!form.email)?'#141414':'#c8f04a',color:(loading||!form.name||!form.email)?'#333':'#000',border:'none',padding:'13px',borderRadius:3,fontSize:13,fontWeight:700,cursor:'pointer',letterSpacing:'0.08em',textTransform:'uppercase',fontFamily:'inherit',transition:'all .2s'}}>
                  {loading?'◌ Creando cuenta...':'Crear cuenta →'}
                </button>
                <p style={{fontSize:10,color:'#2a2a2a',textAlign:'center'}}>Sin tarjeta de crédito requerida.</p>
              </div>
            </div>
          ):(
            <div style={{background:'#0a110a',border:'1px solid #c8f04a22',borderRadius:3,padding:26,animation:'fadeIn .5s ease',textAlign:'center'}}>
              <p style={{fontSize:26,marginBottom:10}}>✓</p>
              <p style={{fontSize:15,fontWeight:700,color:'#c8f04a',marginBottom:6}}>¡Cuenta activada!</p>
              <p style={{fontSize:11,color:'#555',marginBottom:18,lineHeight:1.6}}>Revisa tu email para las instrucciones.<br/>Guarda tu API key:</p>
              <div style={{background:'#0a0a0a',border:'1px solid #1e1e1e',borderRadius:3,padding:12,marginBottom:18,textAlign:'left'}}>
                <p style={{fontSize:11,color:'#4af0c8',fontFamily:'monospace',wordBreak:'break-all'}}>{success.api_key as string}</p>
              </div>
              <a href="/" style={{display:'inline-block',background:'#c8f04a',color:'#000',padding:'11px 24px',borderRadius:3,fontSize:12,fontWeight:700,textDecoration:'none',textTransform:'uppercase',letterSpacing:'0.06em'}}>Abrir Dashboard →</a>
            </div>
          )}
        </div>
      </div>

      <div style={{borderTop:'1px solid #0e0e0e',padding:'20px',textAlign:'center'}}>
        <p style={{fontSize:10,color:'#2a2a2a'}}>BusinessAIOS v1.3.0 · Diego Gilfer · Cali, Colombia</p>
      </div>
    </div>
  )
}

function clamp(min:number, max:number){ return `clamp(${min}px, 5vw, ${max}px)` }
