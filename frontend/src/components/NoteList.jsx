import React, { useState, useEffect } from 'react';

function NoteList() {
  const [students, setStudents] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // নতুন স্টুডেন্ট ফর্মের জন্য স্টেট
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [phone, setPhone] = useState('');

  // ডেটা ফেচ করার ফাংশন
  const fetchData = () => {
    Promise.all([
      fetch('http://127.0.0.1:8000/api/students/').then(res => res.json()),
      fetch('http://127.0.0.1:8000/api/reports/').then(res => res.json())
    ])
      .then(([studentsData, reportsData]) => {
        setStudents(studentsData);
        setReports(reportsData);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ফর্ম সাবমিট হ্যান্ডলার (নতুন স্টুডেন্ট সেভ করার জন্য)
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newStudent = {
      name: name,
      roll: roll,
      phone: phone
    };

    fetch('http://127.0.0.1:8000/api/students/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newStudent),
    })
      .then(response => {
        if (response.ok) {
          setName('');
          setRoll('');
          setPhone('');
          fetchData(); // লিস্ট রিফ্রেশ করার জন্য
          alert('Student added successfully!');
        } else {
          alert('Failed to add student. Check backend fields.');
        }
      })
      .catch(error => console.error('Error:', error));
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px' }}>Loading data...</p>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#2c3e50', textAlign: 'center' }}>SPR Note & Hifz Management System</h1>
      
      {/* নতুন স্টুডেন্ট যোগ করার ফর্ম */}
      <div style={{ background: '#f1f2f6', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#2f3640' }}>Add New Student</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Student Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input 
            type="text" 
            placeholder="Roll Number" 
            value={roll} 
            onChange={(e) => setRoll(e.target.value)} 
            required
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input 
            type="text" 
            placeholder="Phone Number" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            required
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button 
            type="submit" 
            style={{ padding: '10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Add Student
          </button>
        </form>
      </div>

      {/* স্টুডেন্ট সেকশন */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#34495e', borderBottom: '2px solid #3498db', paddingBottom: '8px' }}>
          Students List ({students.length})
        </h2>
        
        {students.length === 0 ? (
          <p>No students found.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginTop: '15px' }}>
            {students.map((student) => (
              <div 
                key={student.id} 
                style={{ 
                  background: '#f8f9fa', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderLeft: '5px solid #3498db'
                }}
              >
                <h3 style={{ margin: '0 0 8px 0', color: '#2980b9' }}>{student.name || student.full_name}</h3>
                <p style={{ margin: '4px 0', color: '#555' }}><strong>Roll:</strong> {student.roll || student.roll_number}</p>
                <p style={{ margin: '4px 0', color: '#555' }}><strong>Phone:</strong> {student.phone || student.guardian_phone || student.phone_number}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* হিজফ রিপোর্ট সেকশন */}
      <section>
        <h2 style={{ color: '#34495e', borderBottom: '2px solid #2ecc71', paddingBottom: '8px' }}>
          Hifz Reports ({reports.length})
        </h2>
        
        {reports.length === 0 ? (
          <p>No reports found.</p>
        ) : (
          <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
            {reports.map((report) => (
              <div 
                key={report.id} 
                style={{ 
                  background: '#f4fcf6', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderLeft: '5px solid #2ecc71'
                }}
              >
                <p style={{ margin: '0 0 6px 0' }}><strong>Date:</strong> {report.date}</p>
                <p style={{ margin: '4px 0' }}><strong>Student:</strong> {report.student_name || report.student}</p>
                <p style={{ margin: '4px 0' }}><strong>Sabaq:</strong> {report.sabaq || report.lesson || 'N/A'}</p>
                <p style={{ margin: '4px 0' }}><strong>Status:</strong> <span style={{ color: '#27ae60', fontWeight: 'bold' }}>{report.status || 'Completed'}</span></p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default NoteList;