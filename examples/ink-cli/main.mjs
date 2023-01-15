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
  await stealUnderpants();
  yield /*#__PURE__*/_jsx(BusinessPlan, {
    phase: phase++
  });
  await _?.();
  yield /*#__PURE__*/_jsx(BusinessPlan, {
    phase: phase++
  });
  await collectProfits();
  yield /*#__PURE__*/_jsx(BusinessPlan, {
    phase: phase++
  });
}
async function stealUnderpants() {
  await delay(3000);
}
async function _() {
  await delay(3000);
}
async function collectProfits() {
  await delay(3000);
}
function BusinessPlan({
  phase
}) {
  return /*#__PURE__*/_jsxs(_Fragment, {
    children: [/*#__PURE__*/_jsx(Phase, {
      number: 1,
      current: phase,
      children: "Stealing underpants"
    }), /*#__PURE__*/_jsx(Phase, {
      number: 2,
      current: phase,
      children: "???"
    }), /*#__PURE__*/_jsx(Phase, {
      number: 3,
      current: phase,
      children: "Collecting profits"
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
    children: [" ", status, " ", children]
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJkZWxheSIsIlRleHQiLCJJbmtTcGlubmVyIiwiU3Bpbm5lciIsImRlZmF1bHQiLCJtYWluIiwiZmFsbGJhY2siLCJwaGFzZSIsInN0ZWFsVW5kZXJwYW50cyIsIl8iLCJjb2xsZWN0UHJvZml0cyIsIkJ1c2luZXNzUGxhbiIsIlBoYXNlIiwibnVtYmVyIiwiY3VycmVudCIsImNoaWxkcmVuIiwic3RhdHVzIiwiYm9sZCJdLCJzb3VyY2VzIjpbIm1haW4uanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGRlbGF5IH0gZnJvbSAncmVhY3Qtc2VxJztcbmltcG9ydCB7IFRleHQgfSBmcm9tICdpbmsnO1xuaW1wb3J0IElua1NwaW5uZXIgZnJvbSAnaW5rLXNwaW5uZXInO1xuXG5jb25zdCBTcGlubmVyID0gSW5rU3Bpbm5lci5kZWZhdWx0O1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiogbWFpbih7IGZhbGxiYWNrIH0pIHtcbiAgZmFsbGJhY2soPFRleHQgLz4pO1xuICBsZXQgcGhhc2UgPSAxO1xuICB5aWVsZCA8QnVzaW5lc3NQbGFuIHBoYXNlPXtwaGFzZSsrfSAvPjtcbiAgYXdhaXQgc3RlYWxVbmRlcnBhbnRzKCk7XG4gIHlpZWxkIDxCdXNpbmVzc1BsYW4gcGhhc2U9e3BoYXNlKyt9IC8+O1xuICBhd2FpdCBfPy4oKTtcbiAgeWllbGQgPEJ1c2luZXNzUGxhbiBwaGFzZT17cGhhc2UrK30gLz47XG4gIGF3YWl0IGNvbGxlY3RQcm9maXRzKCk7XG4gIHlpZWxkIDxCdXNpbmVzc1BsYW4gcGhhc2U9e3BoYXNlKyt9IC8+O1xufVxuXG5hc3luYyBmdW5jdGlvbiBzdGVhbFVuZGVycGFudHMoKSB7XG4gIGF3YWl0IGRlbGF5KDMwMDApO1xufVxuXG5hc3luYyBmdW5jdGlvbiBfKCkge1xuICBhd2FpdCBkZWxheSgzMDAwKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29sbGVjdFByb2ZpdHMoKSB7XG4gIGF3YWl0IGRlbGF5KDMwMDApO1xufVxuXG5mdW5jdGlvbiBCdXNpbmVzc1BsYW4oeyBwaGFzZSB9KSB7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxQaGFzZSBudW1iZXI9ezF9IGN1cnJlbnQ9e3BoYXNlfT5TdGVhbGluZyB1bmRlcnBhbnRzPC9QaGFzZT5cbiAgICAgIDxQaGFzZSBudW1iZXI9ezJ9IGN1cnJlbnQ9e3BoYXNlfT4/Pz88L1BoYXNlPlxuICAgICAgPFBoYXNlIG51bWJlcj17M30gY3VycmVudD17cGhhc2V9PkNvbGxlY3RpbmcgcHJvZml0czwvUGhhc2U+XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFBoYXNlKHsgbnVtYmVyLCBjdXJyZW50LCBjaGlsZHJlbiB9KSB7XG4gIGxldCBzdGF0dXMsIGJvbGQgPSBmYWxzZTtcbiAgaWYgKGN1cnJlbnQgPT09IG51bWJlcikge1xuICAgIHN0YXR1cyA9IDxUZXh0IGNvbG9yPVwiZ3JlZW5cIj48U3Bpbm5lciAvPjwvVGV4dD47XG4gICAgYm9sZCA9IHRydWU7XG4gIH0gZWxzZSBpZiAoY3VycmVudCA+IG51bWJlcikge1xuICAgIHN0YXR1cyA9IDxUZXh0IGNvbG9yPVwieWVsbG93XCI+eydcXHUyNzEzJ308L1RleHQ+O1xuICB9IGVsc2Uge1xuICAgIHN0YXR1cyA9IDxUZXh0PiA8L1RleHQ+O1xuICB9XG4gIHJldHVybiA8VGV4dCBib2xkPXtib2xkfT4ge3N0YXR1c30ge2NoaWxkcmVufTwvVGV4dD47XG59Il0sIm1hcHBpbmdzIjoiQUFBQSxTQUFTQSxLQUFLLFFBQVEsV0FBVztBQUNqQyxTQUFTQyxJQUFJLFFBQVEsS0FBSztBQUMxQixPQUFPQyxVQUFVLE1BQU0sYUFBYTtBQUFDO0FBQUE7QUFBQTtBQUVyQyxNQUFNQyxPQUFPLEdBQUdELFVBQVUsQ0FBQ0UsT0FBTztBQUVsQyxlQUFlLGdCQUFnQkMsSUFBSSxDQUFDO0VBQUVDO0FBQVMsQ0FBQyxFQUFFO0VBQ2hEQSxRQUFRLGVBQUMsS0FBQyxJQUFJLEtBQUcsQ0FBQztFQUNsQixJQUFJQyxLQUFLLEdBQUcsQ0FBQztFQUNiLG1CQUFNLEtBQUMsWUFBWTtJQUFDLEtBQUssRUFBRUEsS0FBSztFQUFHLEVBQUc7RUFDdEMsTUFBTUMsZUFBZSxFQUFFO0VBQ3ZCLG1CQUFNLEtBQUMsWUFBWTtJQUFDLEtBQUssRUFBRUQsS0FBSztFQUFHLEVBQUc7RUFDdEMsTUFBTUUsQ0FBQyxJQUFJO0VBQ1gsbUJBQU0sS0FBQyxZQUFZO0lBQUMsS0FBSyxFQUFFRixLQUFLO0VBQUcsRUFBRztFQUN0QyxNQUFNRyxjQUFjLEVBQUU7RUFDdEIsbUJBQU0sS0FBQyxZQUFZO0lBQUMsS0FBSyxFQUFFSCxLQUFLO0VBQUcsRUFBRztBQUN4QztBQUVBLGVBQWVDLGVBQWUsR0FBRztFQUMvQixNQUFNUixLQUFLLENBQUMsSUFBSSxDQUFDO0FBQ25CO0FBRUEsZUFBZVMsQ0FBQyxHQUFHO0VBQ2pCLE1BQU1ULEtBQUssQ0FBQyxJQUFJLENBQUM7QUFDbkI7QUFFQSxlQUFlVSxjQUFjLEdBQUc7RUFDOUIsTUFBTVYsS0FBSyxDQUFDLElBQUksQ0FBQztBQUNuQjtBQUVBLFNBQVNXLFlBQVksQ0FBQztFQUFFSjtBQUFNLENBQUMsRUFBRTtFQUMvQixvQkFDRTtJQUFBLHdCQUNFLEtBQUMsS0FBSztNQUFDLE1BQU0sRUFBRSxDQUFFO01BQUMsT0FBTyxFQUFFQSxLQUFNO01BQUEsVUFBQztJQUFtQixFQUFRLGVBQzdELEtBQUMsS0FBSztNQUFDLE1BQU0sRUFBRSxDQUFFO01BQUMsT0FBTyxFQUFFQSxLQUFNO01BQUEsVUFBQztJQUFHLEVBQVEsZUFDN0MsS0FBQyxLQUFLO01BQUMsTUFBTSxFQUFFLENBQUU7TUFBQyxPQUFPLEVBQUVBLEtBQU07TUFBQSxVQUFDO0lBQWtCLEVBQVE7RUFBQSxFQUMzRDtBQUVQO0FBRUEsU0FBU0ssS0FBSyxDQUFDO0VBQUVDLE1BQU07RUFBRUMsT0FBTztFQUFFQztBQUFTLENBQUMsRUFBRTtFQUM1QyxJQUFJQyxNQUFNO0lBQUVDLElBQUksR0FBRyxLQUFLO0VBQ3hCLElBQUlILE9BQU8sS0FBS0QsTUFBTSxFQUFFO0lBQ3RCRyxNQUFNLGdCQUFHLEtBQUMsSUFBSTtNQUFDLEtBQUssRUFBQyxPQUFPO01BQUEsdUJBQUMsS0FBQyxPQUFPO0lBQUcsRUFBTztJQUMvQ0MsSUFBSSxHQUFHLElBQUk7RUFDYixDQUFDLE1BQU0sSUFBSUgsT0FBTyxHQUFHRCxNQUFNLEVBQUU7SUFDM0JHLE1BQU0sZ0JBQUcsS0FBQyxJQUFJO01BQUMsS0FBSyxFQUFDLFFBQVE7TUFBQSxVQUFFO0lBQVEsRUFBUTtFQUNqRCxDQUFDLE1BQU07SUFDTEEsTUFBTSxnQkFBRyxLQUFDLElBQUk7TUFBQSxVQUFDO0lBQUMsRUFBTztFQUN6QjtFQUNBLG9CQUFPLE1BQUMsSUFBSTtJQUFDLElBQUksRUFBRUMsSUFBSztJQUFBLFdBQUMsR0FBQyxFQUFDRCxNQUFNLEVBQUMsR0FBQyxFQUFDRCxRQUFRO0VBQUEsRUFBUTtBQUN0RCJ9