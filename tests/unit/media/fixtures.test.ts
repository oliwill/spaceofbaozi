import {it,expect} from 'vitest';
import {createFixtureSnapshot} from '../../../scripts/media/fixtures';
it('nonempty fixture is safe on January first',()=>{
 const snapshot=createFixtureSnapshot('mixed',new Date('2027-01-01T00:00:00Z'));
 expect(snapshot.entries).toHaveLength(35);
 expect(snapshot.entries.every(e=>!e.markDate.calendarDate||e.markDate.calendarDate<='2027-01-01')).toBe(true);
});
