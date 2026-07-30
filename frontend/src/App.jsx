// import React, { useState, useEffect } from 'react';
import { useState, useEffect } from 'react';

function HifzReportPage() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [juz, setJuz] = useState(1);
  const [page, setPage] = useState(1);
  const [session, setSession] = useState('Morning');
  const [mistakesCount, setMistakesCount] = useState(0);
  const [stuckCount, setStuckCount] = useState(0);
  const [comment, setComment] = useState('');

  // ব্যাকএন্ড থেকে স্টুডেন্ট লিস্ট ফেচ করা
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/students/')
      .then((res) => res.json())
      .then((data) => setStudents(data))
      .catch((err) => console.error('Error fetching students:', err));
  }, []);

  // রিপোর্ট সাবমিট করার ফাংশন
  const handleMakeReport = (e) => {
    e.preventDefault();

    const reportData = {
      student: selectedStudent,
      date: date,
      sabaq: `Juz: ${juz}, Page: ${page}`,
      status: 'Completed',
      notes: `Session: ${session}, Mistakes: ${mistakesCount}, Stuck: ${stuckCount}, Comment: ${comment}`
    };

    fetch('http://127.0.0.1:8000/api/reports/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    })
      .then((res) => {
        if (res.ok) {
          alert('Hifz Report Generated Successfully!');
          setComment('');
          setMistakesCount(0);
          setStuckCount(0);
        } else {
          alert('Failed to generate report. Please check fields.');
        }
      })
      .catch((err) => console.error('Error:', err));
  };

  return (
    <div style={{ background: '#121212', color: '#e0e0e0', minHeight: '100vh', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ background: '#1e1e1e', padding: '15px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px', border: '1px solid #333' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '22px' }}>Hifz Daily Progress Report</h2>
          <div style={{ display: 'inline-block', background: '#2c2c2c', padding: '5px 15px', borderRadius: '20px', fontSize: '14px', color: '#aaa' }}>
            DATE <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', marginLeft: '8px', cursor: 'pointer' }} />
          </div>
        </div>

        <form onSubmit={handleMakeReport}>
          
          {/* Student Selection */}
          <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #333' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '8px', fontWeight: 'bold' }}>STUDENT</label>
            <select 
              value={selectedStudent} 
              onChange={(e) => setSelectedStudent(e.target.value)}
              required
              style={{ width: '100%', background: '#2c2c2c', border: '1px solid #444', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '16px' }}
            >
              <option value="">Select student name...</option>
              {students.map((stu) => (
                <option key={stu.id} value={stu.id}>{stu.full_name} (Roll: {stu.roll_number || 'N/A'})</option>
              ))}
            </select>

            {/* Juz / Page Counter */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#888', fontWeight: 'bold' }}>JUZ / PAGE</span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ background: '#2c2c2c', padding: '8px 15px', borderRadius: '8px' }}>
                  Juz: <input type="number" value={juz} onChange={(e) => setJuz(e.target.value)} style={{ width: '40px', background: 'transparent', border: 'none', color: '#fff', textAlign: 'center' }} />
                </div>
                <div style={{ background: '#2c2c2c', padding: '8px 15px', borderRadius: '8px' }}>
                  Page: <input type="number" value={page} onChange={(e) => setPage(e.target.value)} style={{ width: '40px', background: 'transparent', border: 'none', color: '#fff', textAlign: 'center' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Session Summary */}
          <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #333' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#aaa', fontSize: '14px' }}>Session Summary</h4>
            
            <select 
              value={session} 
              onChange={(e) => setSession(e.target.value)}
              style={{ width: '100%', background: '#2c2c2c', border: '1px solid #444', padding: '12px', borderRadius: '8px', color: '#fff', marginBottom: '15px' }}
            >
              <option value="Morning">Morning Session</option>
              <option value="Evening">Evening Session</option>
              <option value="Night">Night Session</option>
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ background: '#2c2c2c', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: '#888' }}>MISTAKE</span>
                <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0', color: '#ff6b6b' }}>{mistakesCount}</div>
                <button type="button" onClick={() => setMistakesCount(mistakesCount + 1)} style={{ background: '#444', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>+ Add</button>
              </div>
              <div style={{ background: '#2c2c2c', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: '#888' }}>STUCK</span>
                <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '5px 0', color: '#feca57' }}>{stuckCount}</div>
                <button type="button" onClick={() => setStuckCount(stuckCount + 1)} style={{ background: '#444', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>+ Add</button>
              </div>
            </div>
          </div>

          {/* Comment Section */}
          <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #333' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '14px' }}>Comment</h4>
            <textarea 
              rows="3" 
              placeholder="Write Your comment..." 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ width: '100%', background: '#2c2c2c', border: '1px solid #444', padding: '12px', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              type="button" 
              onClick={() => alert('Record added locally!')} 
              style={{ flex: 1, background: '#2c2c2c', color: '#fff', border: '1px solid #444', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Add to Record
            </button>
            <button 
              type="submit" 
              style={{ flex: 1, background: '#e0e0e0', color: '#121212', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Make Report
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default HifzReportPage;