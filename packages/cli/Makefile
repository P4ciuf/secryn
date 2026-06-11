APP_NAME = sv
VERSION = 0.1.0

.PHONY: all build install clean test lint

all: install

build:
	pip install -e .

install:
	pip install -e .

install-user:
	pip install --user -e .

clean:
	rm -rf build/ dist/ *.egg-info src/*.egg-info

test:
	python -m pytest tests/

lint:
	ruff check src/

tidy:
	ruff format src/
