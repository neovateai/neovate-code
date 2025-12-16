# Test: Commit Command Merge State Detection

This document describes how to manually test the merge state detection feature in the `neo commit` command.

## Setup: Create a merge conflict scenario

```bash
# 1. Create a test directory
mkdir /tmp/test-merge
cd /tmp/test-merge

# 2. Initialize git repo
git init
git config user.name "Test"
git config user.email "test@test.com"

# 3. Create initial file and commit
echo "line 1" > test.txt
git add test.txt
git commit -m "initial commit"

# 4. Create a branch and make changes
git checkout -b feature
echo "line 1 - from feature" > test.txt
git commit -am "feature change"

# 5. Go back to main and make conflicting changes
git checkout main
echo "line 1 - from main" > test.txt
git commit -am "main change"

# 6. Attempt merge (this will cause a conflict)
git merge feature
```

You should see:

```
Auto-merging test.txt
CONFLICT (content): Merge conflict in test.txt
Automatic merge failed; fix conflicts and then commit the result.
```

## Test the blocking behavior

```bash
# 7. Resolve the conflict manually
echo "line 1 - resolved" > test.txt

# 8. Stage the resolved file
git add test.txt

# 9. Now try running neo commit (should be blocked!)
neo commit
```

**Expected result**: You should see the error message:

```
❌ Error: Merge state detected.

Please use the following commands to complete the merge:
  git status    # Check conflict status
  git commit    # Create merge commit

Using commit command would create an improper commit message
and may require re-resolving conflicts.
```

## Verify the correct workflow

```bash
# 10. Complete the merge properly with git commit
git commit -m "Merge branch 'feature'"

# 11. Now neo commit should work normally (if you have new changes)
echo "new change" >> test.txt
neo commit -s
```

## Cleanup

```bash
cd ~
rm -rf /tmp/test-merge
```

