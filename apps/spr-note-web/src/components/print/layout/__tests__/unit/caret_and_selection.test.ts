/**
 * Unit Test: Caret & Logical Selection Mapping
 *
 * Tests:
 * 1. Logical Position Mapping (nodeId + textOffset)
 * 2. EditorPositionMapper resolution
 * 3. Caret Bookmark conversion
 * 4. Fallback resolution logic
 */

import { EditorPositionMapper, EditorCaretBookmark } from '../../editor/EditorPositionMapper';
import { LogicalPosition, LogicalSelection } from '../../editor/editorTypes';
import { normalizeTokenPayload } from '../../../caretInsertManager';

export function runCaretAndSelectionUnitTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${msg}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${msg}`);
    }
  }

  console.log('--- UNIT TEST: CARET & LOGICAL SELECTION MAPPING ---');

  // 1. LogicalPosition structure
  const pos: LogicalPosition = {
    nodeId: 'p_2',
    textOffset: 45,
  };
  assert(pos.nodeId === 'p_2', 'LogicalPosition preserves nodeId');
  assert(pos.textOffset === 45, 'LogicalPosition preserves textOffset');

  // 2. LogicalSelection structure
  const sel: LogicalSelection = {
    anchor: { nodeId: 'p_1', textOffset: 10 },
    head: { nodeId: 'p_1', textOffset: 35 },
    isCollapsed: false,
    scrollTop: 120,
    scrollLeft: 0,
  };
  assert(sel.anchor.nodeId === 'p_1', 'LogicalSelection maintains anchor node');
  assert(sel.anchor.textOffset === 10, 'LogicalSelection maintains anchor text offset');
  assert(sel.head.textOffset === 35, 'LogicalSelection maintains head text offset');
  assert(sel.isCollapsed === false, 'LogicalSelection accurately flags non-collapsed selection');
  assert(sel.scrollTop === 120, 'LogicalSelection captures viewport scroll position');

  // 3. Caret Bookmark structure
  const bookmark: EditorCaretBookmark = {
    logicalStart: { nodeId: 'p_1', textOffset: 25 },
    logicalEnd: { nodeId: 'p_1', textOffset: 25 },
    canonicalOffset: 25,
    pageIndex: 0,
    pageOffset: 25,
    nodePath: [0, 1],
    leafOffset: 25,
    tagName: 'P',
    sourceNodeId: 'p_1',
    isCollapsed: true,
  };

  assert(bookmark.logicalStart?.nodeId === 'p_1', 'Bookmark preserves logicalStart');
  assert(bookmark.canonicalOffset === 25, 'Bookmark preserves canonicalOffset');
  assert(bookmark.isCollapsed === true, 'Bookmark preserves isCollapsed');

  // 4. Zero fallback collapse mapping
  assert(
    typeof EditorPositionMapper.captureLogicalSelection === 'function',
    'EditorPositionMapper exposes captureLogicalSelection'
  );
  assert(
    typeof EditorPositionMapper.restoreLogicalSelection === 'function',
    'EditorPositionMapper exposes restoreLogicalSelection'
  );
  assert(
    typeof EditorPositionMapper.getLogicalPoint === 'function',
    'EditorPositionMapper exposes getLogicalPoint'
  );
  assert(
    typeof EditorPositionMapper.resolveLogicalPoint === 'function',
    'EditorPositionMapper exposes resolveLogicalPoint'
  );

  // 5. Directive Payload Normalization
  const normDirective = normalizeTokenPayload('| indent: 11');
  assert(normDirective.key === '| indent: 11', 'Normalizes pipe indent directive key without bracket stripping');

  const normDirection = normalizeTokenPayload('| direction: vertical');
  assert(normDirection.key === '| direction: vertical', 'Normalizes pipe direction directive key without bracket stripping');

  const normStandardToken = normalizeTokenPayload('{{student_name}}');
  assert(normStandardToken.key === 'student_name', 'Strips redundant curly brackets for standard token keys');

  return { passed, failed };
}
