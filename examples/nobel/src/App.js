import './css/App.css';
import { useState } from 'react';
import { useNobelPrize } from './nobel.js';

const categories = [
  { code: 'che', name: 'Chemistry' },
  { code: 'eco', name: 'Economics' },
  { code: 'lit', name: 'Literature' },
  { code: 'pea', name: 'Peace' },
  { code: 'phy', name: 'Physics' },
  { code: 'med', name: 'Medicines' },
];
const currentYear = (new Date()).getYear() + 1900;
const years = [ ...(function*() {
  for (let y = 1901; y < currentYear; y++) {
    yield `${y}`;
  }
})() ];

function App() {
  const [ year, setYear ] = useState('');
  const [ category, setCategory ] = useState('');
  const prize = useNobelPrize(category, year);
  return (
    <div className="App">
      <div className="toolbar">
        <select onChange={evt => setCategory(evt.target.value)} value={category} required>
          <option value="">Category</option>
          {categories.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
        </select>
        {' '}
        <select onChange={evt => setYear(evt.target.value)} value={year} required>
          <option value="">Year</option>
          {years.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>
      {prize && <Prize {...prize} />}
    </div>
  );
}

function Prize({ fullName, amount, amountAdjusted, laureates }) {
  return (
    <div className="content">
      <h2>{fullName}</h2>
      <div><b>Amount:</b> ${amount}</div>
      <div><b>Amount (in present dollar):</b> ${amountAdjusted}</div>
      <h2>Laureate{laureates?.length > 1 ? 's' : ''}</h2>
      {laureates?.map((laureate, i) => {
        const {
          fullName,
          motivation,
          gender,
          birth,
          death,
          affiliation,
          wikipedia,
        } = laureate;
        return (
          <div key={i}>
            <h3>{fullName}</h3>
            <div><b>Motivation:</b> {motivation}</div>
            <div><b>Affiliation:</b> {affiliation}</div>
            <div><b>Gender:</b> {gender}</div>
            <div><b>Birth:</b> {birth}</div>
            <div><b>Death:</b> {death}</div>
            <div><b>Wikipedia:</b> <a href={wikipedia} rel="noreferrer" target="_blank">{wikipedia}</a></div>
          </div>
        );
      })}
    </div>
  );
}

export default App;
