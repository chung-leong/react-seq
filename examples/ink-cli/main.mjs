import { delay } from 'react-seq';
import { Text } from 'ink';
import InkSpinner from 'ink-spinner';
import { jsx as _jsx } from "react/jsx-runtime";
import { Fragment as _Fragment } from "react/jsx-runtime";
import { jsxs as _jsxs } from "react/jsx-runtime";
const Spinner = InkSpinner.default;
export default async function* main({
  fallback
}) {
  fallback( /*#__PURE__*/_jsx(Text, {}));
  let phase = 1;
  yield /*#__PURE__*/_jsx(BusinessPlan, {
    phase: phase++
  });
  await delay(3000);
  yield /*#__PURE__*/_jsx(BusinessPlan, {
    phase: phase++
  });
  await delay(3000);
  yield /*#__PURE__*/_jsx(BusinessPlan, {
    phase: phase++
  });
  await delay(3000);
  yield /*#__PURE__*/_jsx(BusinessPlan, {
    phase: phase++
  });
}
function BusinessPlan({
  phase
}) {
  return /*#__PURE__*/_jsxs(_Fragment, {
    children: [/*#__PURE__*/_jsx(Phase, {
      number: 1,
      current: phase,
      children: "Steal underpants"
    }), /*#__PURE__*/_jsx(Phase, {
      number: 2,
      current: phase,
      children: "???"
    }), /*#__PURE__*/_jsx(Phase, {
      number: 3,
      current: phase,
      children: "Profits"
    })]
  });
}
function Phase({
  number,
  current,
  children
}) {
  let status,
    bold = false;
  if (current === number) {
    status = /*#__PURE__*/_jsx(Text, {
      color: "green",
      children: /*#__PURE__*/_jsx(Spinner, {})
    });
    bold = true;
  } else if (current > number) {
    status = /*#__PURE__*/_jsx(Text, {
      color: "yellow",
      children: '\u2713'
    });
  } else {
    status = /*#__PURE__*/_jsx(Text, {
      children: " "
    });
  }
  return /*#__PURE__*/_jsxs(Text, {
    bold: bold,
    children: [status, " ", children]
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJkZWxheSIsIlRleHQiLCJJbmtTcGlubmVyIiwiU3Bpbm5lciIsImRlZmF1bHQiLCJtYWluIiwiZmFsbGJhY2siLCJwaGFzZSIsIkJ1c2luZXNzUGxhbiIsIlBoYXNlIiwibnVtYmVyIiwiY3VycmVudCIsImNoaWxkcmVuIiwic3RhdHVzIiwiYm9sZCJdLCJzb3VyY2VzIjpbIm1haW4uanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGRlbGF5IH0gZnJvbSAncmVhY3Qtc2VxJztcbmltcG9ydCB7IFRleHQgfSBmcm9tICdpbmsnO1xuaW1wb3J0IElua1NwaW5uZXIgZnJvbSAnaW5rLXNwaW5uZXInO1xuXG5jb25zdCBTcGlubmVyID0gSW5rU3Bpbm5lci5kZWZhdWx0O1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiogbWFpbih7IGZhbGxiYWNrIH0pIHtcbiAgZmFsbGJhY2soPFRleHQgLz4pO1xuICBsZXQgcGhhc2UgPSAxO1xuICB5aWVsZCA8QnVzaW5lc3NQbGFuIHBoYXNlPXtwaGFzZSsrfSAvPjtcbiAgYXdhaXQgZGVsYXkoMzAwMCk7XG4gIHlpZWxkIDxCdXNpbmVzc1BsYW4gcGhhc2U9e3BoYXNlKyt9IC8+O1xuICBhd2FpdCBkZWxheSgzMDAwKTtcbiAgeWllbGQgPEJ1c2luZXNzUGxhbiBwaGFzZT17cGhhc2UrK30gLz47XG4gIGF3YWl0IGRlbGF5KDMwMDApO1xuICB5aWVsZCA8QnVzaW5lc3NQbGFuIHBoYXNlPXtwaGFzZSsrfSAvPjtcbn1cblxuZnVuY3Rpb24gQnVzaW5lc3NQbGFuKHsgcGhhc2UgfSkge1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8UGhhc2UgbnVtYmVyPXsxfSBjdXJyZW50PXtwaGFzZX0+U3RlYWwgdW5kZXJwYW50czwvUGhhc2U+XG4gICAgICA8UGhhc2UgbnVtYmVyPXsyfSBjdXJyZW50PXtwaGFzZX0+Pz8/PC9QaGFzZT5cbiAgICAgIDxQaGFzZSBudW1iZXI9ezN9IGN1cnJlbnQ9e3BoYXNlfT5Qcm9maXRzPC9QaGFzZT5cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gUGhhc2UoeyBudW1iZXIsIGN1cnJlbnQsIGNoaWxkcmVuIH0pIHtcbiAgbGV0IHN0YXR1cywgYm9sZCA9IGZhbHNlO1xuICBpZiAoY3VycmVudCA9PT0gbnVtYmVyKSB7XG4gICAgc3RhdHVzID0gPFRleHQgY29sb3I9XCJncmVlblwiPjxTcGlubmVyIC8+PC9UZXh0PjtcbiAgICBib2xkID0gdHJ1ZTtcbiAgfSBlbHNlIGlmIChjdXJyZW50ID4gbnVtYmVyKSB7XG4gICAgc3RhdHVzID0gPFRleHQgY29sb3I9XCJ5ZWxsb3dcIj57J1xcdTI3MTMnfTwvVGV4dD47XG4gIH0gZWxzZSB7XG4gICAgc3RhdHVzID0gPFRleHQ+IDwvVGV4dD47XG4gIH1cbiAgcmV0dXJuIDxUZXh0IGJvbGQ9e2JvbGR9PntzdGF0dXN9IHtjaGlsZHJlbn08L1RleHQ+O1xufSJdLCJtYXBwaW5ncyI6IkFBQUEsU0FBU0EsS0FBSyxRQUFRLFdBQVc7QUFDakMsU0FBU0MsSUFBSSxRQUFRLEtBQUs7QUFDMUIsT0FBT0MsVUFBVSxNQUFNLGFBQWE7QUFBQztBQUFBO0FBQUE7QUFFckMsTUFBTUMsT0FBTyxHQUFHRCxVQUFVLENBQUNFLE9BQU87QUFFbEMsZUFBZSxnQkFBZ0JDLElBQUksQ0FBQztFQUFFQztBQUFTLENBQUMsRUFBRTtFQUNoREEsUUFBUSxlQUFDLEtBQUMsSUFBSSxLQUFHLENBQUM7RUFDbEIsSUFBSUMsS0FBSyxHQUFHLENBQUM7RUFDYixtQkFBTSxLQUFDLFlBQVk7SUFBQyxLQUFLLEVBQUVBLEtBQUs7RUFBRyxFQUFHO0VBQ3RDLE1BQU1QLEtBQUssQ0FBQyxJQUFJLENBQUM7RUFDakIsbUJBQU0sS0FBQyxZQUFZO0lBQUMsS0FBSyxFQUFFTyxLQUFLO0VBQUcsRUFBRztFQUN0QyxNQUFNUCxLQUFLLENBQUMsSUFBSSxDQUFDO0VBQ2pCLG1CQUFNLEtBQUMsWUFBWTtJQUFDLEtBQUssRUFBRU8sS0FBSztFQUFHLEVBQUc7RUFDdEMsTUFBTVAsS0FBSyxDQUFDLElBQUksQ0FBQztFQUNqQixtQkFBTSxLQUFDLFlBQVk7SUFBQyxLQUFLLEVBQUVPLEtBQUs7RUFBRyxFQUFHO0FBQ3hDO0FBRUEsU0FBU0MsWUFBWSxDQUFDO0VBQUVEO0FBQU0sQ0FBQyxFQUFFO0VBQy9CLG9CQUNFO0lBQUEsd0JBQ0UsS0FBQyxLQUFLO01BQUMsTUFBTSxFQUFFLENBQUU7TUFBQyxPQUFPLEVBQUVBLEtBQU07TUFBQSxVQUFDO0lBQWdCLEVBQVEsZUFDMUQsS0FBQyxLQUFLO01BQUMsTUFBTSxFQUFFLENBQUU7TUFBQyxPQUFPLEVBQUVBLEtBQU07TUFBQSxVQUFDO0lBQUcsRUFBUSxlQUM3QyxLQUFDLEtBQUs7TUFBQyxNQUFNLEVBQUUsQ0FBRTtNQUFDLE9BQU8sRUFBRUEsS0FBTTtNQUFBLFVBQUM7SUFBTyxFQUFRO0VBQUEsRUFDaEQ7QUFFUDtBQUVBLFNBQVNFLEtBQUssQ0FBQztFQUFFQyxNQUFNO0VBQUVDLE9BQU87RUFBRUM7QUFBUyxDQUFDLEVBQUU7RUFDNUMsSUFBSUMsTUFBTTtJQUFFQyxJQUFJLEdBQUcsS0FBSztFQUN4QixJQUFJSCxPQUFPLEtBQUtELE1BQU0sRUFBRTtJQUN0QkcsTUFBTSxnQkFBRyxLQUFDLElBQUk7TUFBQyxLQUFLLEVBQUMsT0FBTztNQUFBLHVCQUFDLEtBQUMsT0FBTztJQUFHLEVBQU87SUFDL0NDLElBQUksR0FBRyxJQUFJO0VBQ2IsQ0FBQyxNQUFNLElBQUlILE9BQU8sR0FBR0QsTUFBTSxFQUFFO0lBQzNCRyxNQUFNLGdCQUFHLEtBQUMsSUFBSTtNQUFDLEtBQUssRUFBQyxRQUFRO01BQUEsVUFBRTtJQUFRLEVBQVE7RUFDakQsQ0FBQyxNQUFNO0lBQ0xBLE1BQU0sZ0JBQUcsS0FBQyxJQUFJO01BQUEsVUFBQztJQUFDLEVBQU87RUFDekI7RUFDQSxvQkFBTyxNQUFDLElBQUk7SUFBQyxJQUFJLEVBQUVDLElBQUs7SUFBQSxXQUFFRCxNQUFNLEVBQUMsR0FBQyxFQUFDRCxRQUFRO0VBQUEsRUFBUTtBQUNyRCJ9