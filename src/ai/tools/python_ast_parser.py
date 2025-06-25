import ast
import json
import sys

class PythonCodeAnalyzer(ast.NodeVisitor):
    def __init__(self, source_code):
        self.source_code_lines = source_code.splitlines()
        self.functions = []
        self.classes = []
        self.imports = []
        self.calls = []
        self.current_context = [] # To track current class/function context

    def _get_node_code_snippet(self, node):
        if hasattr(node, 'lineno') and hasattr(node, 'end_lineno'):
            # ast line numbers are 1-based
            return "\n".join(self.source_code_lines[node.lineno-1:node.end_lineno])
        return None

    def _get_full_name(self, node_name):
        if not self.current_context:
            return node_name
        return ".".join(self.current_context + [node_name])

    def visit_FunctionDef(self, node):
        func_name = node.name
        full_name = self._get_full_name(func_name)

        self.functions.append({
            "name": full_name,
            "args": [arg.arg for arg in node.args.args],
            "start_line": node.lineno,
            "end_line": node.end_lineno,
            "docstring": ast.get_docstring(node),
            "decorators": [decorator.id if isinstance(decorator, ast.Name) else ast.dump(decorator) for decorator in node.decorator_list],
            "code_snippet": self._get_node_code_snippet(node)
        })
        self.current_context.append(func_name)
        self.generic_visit(node) # Visit children to find calls within this function
        self.current_context.pop()

    def visit_AsyncFunctionDef(self, node):
        # Treat async functions similarly to sync functions for now
        func_name = node.name
        full_name = self._get_full_name(func_name)

        self.functions.append({
            "name": full_name,
            "args": [arg.arg for arg in node.args.args],
            "start_line": node.lineno,
            "end_line": node.end_lineno,
            "docstring": ast.get_docstring(node),
            "decorators": [decorator.id if isinstance(decorator, ast.Name) else ast.dump(decorator) for decorator in node.decorator_list],
            "is_async": True,
            "code_snippet": self._get_node_code_snippet(node)
        })
        self.current_context.append(func_name)
        self.generic_visit(node)
        self.current_context.pop()

    def visit_ClassDef(self, node):
        class_name = node.name
        full_name = self._get_full_name(class_name)

        self.classes.append({
            "name": full_name,
            "base_classes": [base.id if isinstance(base, ast.Name) else ast.dump(base) for base in node.bases],
            "start_line": node.lineno,
            "end_line": node.end_lineno,
            "docstring": ast.get_docstring(node),
            "decorators": [decorator.id if isinstance(decorator, ast.Name) else ast.dump(decorator) for decorator in node.decorator_list],
            "code_snippet": self._get_node_code_snippet(node)
        })
        self.current_context.append(class_name)
        self.generic_visit(node) # Visit children (methods, nested classes)
        self.current_context.pop()

    def visit_Import(self, node):
        for alias in node.names:
            self.imports.append({
                "type": "import",
                "module": None, # For direct import like 'import os'
                "name": alias.name,
                "asname": alias.asname,
                "start_line": node.lineno,
                "end_line": node.end_lineno,
            })

    def visit_ImportFrom(self, node):
        module = node.module
        for alias in node.names:
            self.imports.append({
                "type": "import_from",
                "module": module,
                "name": alias.name,
                "asname": alias.asname,
                "level": node.level, # For relative imports
                "start_line": node.lineno,
                "end_line": node.end_lineno,
            })

    def visit_Call(self, node):
        callee_name = None
        if isinstance(node.func, ast.Name): # e.g. my_function()
            callee_name = node.func.id
        elif isinstance(node.func, ast.Attribute): # e.g. self.method(), obj.method(), module.function()
            # Try to reconstruct the full attribute path
            attr_path = []
            curr_attr = node.func
            while isinstance(curr_attr, ast.Attribute):
                attr_path.insert(0, curr_attr.attr)
                curr_attr = curr_attr.value
            if isinstance(curr_attr, ast.Name): # Base of the attribute access is a Name
                attr_path.insert(0, curr_attr.id)
                callee_name = ".".join(attr_path)
            # else: Could be more complex, e.g. (some_expression).method(). For now, only capture simple Name.Attribute chains.

        if callee_name:
            caller_name = ".".join(self.current_context) if self.current_context else "__main__" # Global scope if not in function/class
            self.calls.append({
                "caller": caller_name,
                "callee": callee_name,
                "start_line": node.lineno,
                "end_line": node.end_lineno if hasattr(node, 'end_lineno') else node.lineno, # Calls might not have end_lineno
            })
        self.generic_visit(node) # Visit arguments of the call, which might contain other calls


def main():
    source_code = sys.stdin.read()
    try:
        tree = ast.parse(source_code)
        analyzer = PythonCodeAnalyzer(source_code)
        analyzer.visit(tree)

        output = {
            "functions": analyzer.functions,
            "classes": analyzer.classes,
            "imports": analyzer.imports,
            "calls": analyzer.calls
        }
        print(json.dumps(output, indent=2))
    except SyntaxError as e:
        print(json.dumps({"error": "SyntaxError", "message": str(e), "lineno": e.lineno, "offset": e.offset}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": "Exception", "message": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
