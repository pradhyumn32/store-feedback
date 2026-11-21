import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';


const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';


const initial = { name:'', email:'', address:'', password:'' };


function App() {
  const [session,setSession]=useState(()=>JSON.parse(localStorage.getItem('session')||'null'));

  const [mode,setMode]=useState('login'), [form,setForm]=useState(initial), [error,setError]=useState('');

  
  const request=async(path,options={})=>{
    const r=await fetch(API+path,{...options,headers:{'Content-Type':'application/json',...(session?{Authorization:`Bearer ${session.token}`}:{})}}); 
    
    const body=r.status===204?null:await r.json(); if(!r.ok) throw new Error(body.error||Object.values(body.errors||{})[0]||'Request failed');
    
    return body
  };
  
  const auth=async e=>{
    e.preventDefault();setError('');
    
    try {
      const data=await request(`/auth/${mode==='signup'?'register':'login'}`,{method:'POST',body:JSON.stringify(form)});
      
      localStorage.setItem('session',JSON.stringify(data));setSession(data)
    }
    
    catch(e){
      setError(e.message)
    }};
  
  
  const logout=()=>{localStorage.removeItem('session');setSession(null);setForm(initial)};
  
  
  if(!session) return <main className="auth"><section><p className="eyebrow">STORE RATINGS</p><h1>Find a great place.</h1><p>Rate the stores you visit and make better choices together.</p></section><form onSubmit={auth}><h2>{mode==='signup'?'Create your account':'Welcome back'}</h2>{mode==='signup'&&<Field label="Full name" value={form.name} onChange={v=>setForm({...form,name:v})}/>}<Field label="Email" type="email" value={form.email} onChange={v=>setForm({...form,email:v})}/>{mode==='signup'&&<Field label="Address" value={form.address} onChange={v=>setForm({...form,address:v})}/>}<Field label="Password" type="password" value={form.password} onChange={v=>setForm({...form,password:v})}/>{error&&<p className="error">{error}</p>}<button>{mode==='signup'?'Sign up':'Sign in'}</button><p className="switch">{mode==='signup'?'Already registered?':'New here?'} <button type="button" className="link" onClick={()=>{setMode(mode==='signup'?'login':'signup');setError('')}}>{mode==='signup'?'Sign in':'Create account'}</button></p></form></main>;
  
  
  
  return <main className="app"><header><div><p className="eyebrow">STORE RATINGS</p><strong>{session.user.name}</strong><span className="badge">{session.user.role}</span></div><button className="ghost" onClick={logout}>Log out</button></header>{session.user.role==='ADMIN'?<Admin request={request}/>:session.user.role==='OWNER'?<Owner request={request}/>:<Stores request={request}/>}<Password request={request}/></main>
}


function Field({label,value,onChange,type='text'}) { 
  return (
  <label>{label}
  <input required value={value} type={type} onChange={e=>onChange(e.target.value)}/>
  </label>
) }

function SortHead({label,field,setSort}) { 
  return (
  <th>
    <button className="sort" onClick={()=>setSort(s=>({sort:field,dir:s.sort===field&&s.dir==='asc'?'desc':'asc'}))}>{label} ↕
    </button>
  </th>
 )
}

function Stores({request}) { 
  const [stores,setStores]=useState([]),[q,setQ]=useState(''),[sort,setSort]=useState({sort:'name',dir:'asc'}),[error,setError]=useState('');
  const load=()=>request(`/stores?q=${encodeURIComponent(q)}&sort=${sort.sort}&dir=${sort.dir}`).then(setStores).catch(e=>setError(e.message));
  
  useEffect(load,[q,sort.sort,sort.dir]);
  
  const rate=async(id,score)=>{
    try{
      await request(`/stores/${id}/rating`,{method:'PUT',body:JSON.stringify({score:Number(score)})});
      
      load()}catch(e){setError(e.message)}};
      return <section>
        <h1>Explore stores</h1>
        <input className="search" placeholder="Search name or address" value={q} onChange={e=>setQ(e.target.value)}/>
        {error&&<p className="error">{error}</p>}
        <table>
          <thead>
            <tr><SortHead label="Store" field="name" setSort={setSort}/>
                <SortHead label="Address" field="address" setSort={setSort}/>
                <SortHead label="Overall" field="rating" setSort={setSort}/>
                <th>Your rating</th>
            </tr>
          </thead>
          <tbody>
            {stores.map(s=><tr key={s.id}>
            <td><strong>{s.name}</strong><br/><small>{s.email}</small></td>
            <td>{s.address}</td>
            <td>★ {s.rating}</td>
            <td>
              <select value={s.user_rating||''} onChange={e=>rate(s.id,e.target.value)}>
              <option value="">Rate</option>{[1,2,3,4,5].map(x=><option key={x}>{x}</option>)}
              </select>
            </td>
          </tr>)}
          </tbody>
          </table>
          </section>
          }

function Admin({request}) {
  const [summary,setSummary]=useState({}),[users,setUsers]=useState([]),[q,setQ]=useState(''),[role,setRole]=useState(''),[sort,setSort]=useState({sort:'name',dir:'asc'}),[adding,setAdding]=useState(false),[form,setForm]=useState(initial);
  
  const load=()=>{request('/admin/summary').then(setSummary);
  
  request(`/admin/users?q=${encodeURIComponent(q)}&role=${role}&sort=${sort.sort}&dir=${sort.dir}`).then(setUsers)};
  
  useEffect(load,[q,role,sort.sort,sort.dir]);
  const create=async e=>{e.preventDefault();
  
    await request('/admin/users',{method:'POST',body:JSON.stringify(form)});
  
    setAdding(false);setForm(initial);load()};
    
    return <section>
      <h1>Administrator dashboard</h1>
      <div className="metrics">
        <Metric n={summary.users} t="Users"/>
        <Metric n={summary.stores} t="Stores"/>
        <Metric n={summary.ratings} t="Ratings"/>
      </div>
      <div className="toolbar">
        <input className="search" placeholder="Filter name, email, address" value={q} onChange={e=>setQ(e.target.value)}/>
        <select value={role} onChange={e=>setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="USER">Users</option>
          <option value="ADMIN">Admins</option>
          <option value="OWNER">Owners</option>
          </select><button onClick={()=>setAdding(!adding)}>Add user</button>
      </div>{adding&&<form className="inline" onSubmit={create}>
        <Field label="Name" value={form.name} onChange={v=>setForm({...form,name:v})}/>
          <Field label="Email" value={form.email} onChange={v=>setForm({...form,email:v})}/>
            <Field label="Address" value={form.address} onChange={v=>setForm({...form,address:v})}/>
              <Field label="Password" type="password" value={form.password} onChange={v=>setForm({...form,password:v})}/>
                <label>Role<select value={form.role||'USER'} onChange={e=>setForm({...form,role:e.target.value})}>
                  <option>USER</option><option>ADMIN</option><option>OWNER</option></select></label><button>Add</button></form>}<table><thead><tr><SortHead label="Name" field="name" setSort={setSort}/><SortHead label="Email" field="email" setSort={setSort}/><SortHead label="Address" field="address" setSort={setSort}/><SortHead label="Role" field="role" setSort={setSort}/><th>Owner rating</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.address}</td><td>{u.role}</td><td>{u.role==='OWNER'?`★ ${u.rating}`:'—'}</td></tr>)}</tbody></table><AdminStores request={request}/></section>}

function AdminStores({request}) { 
  
  const [stores,setStores]=useState([]),[form,setForm]=useState({name:'',email:'',address:''}),[open,setOpen]=useState(false),[error,setError]=useState(''); 
  
  const load=()=>request('/stores?sort=name').then(setStores).catch(e=>setError(e.message));
  
  useEffect(load,[]);
  
  const submit=async e=>{
    e.preventDefault();
    
    try{
      await request('/admin/stores',{method:'POST',body:JSON.stringify(form)});
      
      setForm({name:'',email:'',address:''});
      
      setOpen(false);load()}catch(e){setError(e.message)

      }
    };
      
      return <div className="admin-stores"><div className="toolbar"><h2>Stores</h2><button onClick={()=>setOpen(!open)}>Add store</button></div>{open&&<form className="inline store-form" onSubmit={submit}><Field label="Store name" value={form.name} onChange={v=>setForm({...form,name:v})}/><Field label="Email" value={form.email} onChange={v=>setForm({...form,email:v})}/><Field label="Address" value={form.address} onChange={v=>setForm({...form,address:v})}/><button>Add</button></form>}{error&&<p className="error">{error}</p>}<table><thead><tr><th>Name</th><th>Email</th><th>Address</th><th>Rating</th></tr></thead><tbody>{stores.map(s=><tr key={s.id}><td>{s.name}</td><td>{s.email}</td><td>{s.address}</td><td>★ {s.rating}</td></tr>)}</tbody></table></div> 
    }

function Owner({request}) { const [data,setData]=useState([]); useEffect(()=>{request('/owner/dashboard').then(setData)},[]);return <section><h1>My store</h1>{data.map(s=><div key={s.name}><div className="owner-card"><h2>{s.name}</h2><strong>★ {s.rating} average rating</strong></div><h2>Recent raters</h2><table><thead><tr><th>Name</th><th>Email</th><th>Rating</th></tr></thead><tbody>{(s.raters||[]).map((r,i)=><tr key={i}><td>{r.name}</td><td>{r.email}</td><td>★ {r.score}</td></tr>)}</tbody></table></div>)}</section> }

function Metric({n,t}) {

  return <article><strong>{n||0}</strong><span>{t}</span></article>};
  
  function Password({request}) {
    const [open,setOpen]=useState(false),[password,setPassword]=useState(''),[notice,setNotice]=useState('');
    
    const submit=async e=>{e.preventDefault();
      try{
        
        await request('/me/password',{method:'PUT',body:JSON.stringify({password})});
        
        setNotice('Password updated.');setPassword('')}catch(e){setNotice(e.message)

        }
      };
      
      return <><button className="password-toggle" onClick={()=>setOpen(!open)}>Change password</button>{open&&<form className="password" onSubmit={submit}><Field label="New password" type="password" value={password} onChange={setPassword}/><button>Save password</button>{notice&&<p>{notice}</p>}</form>}</>
    
    };
  
  
createRoot(document.getElementById('root')).render(<App/>);
