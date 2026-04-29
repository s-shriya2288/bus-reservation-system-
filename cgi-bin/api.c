#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define DATA_FILE "cgi-bin/buses.txt"
#define USERS_FILE "cgi-bin/users.txt"
#define BOOKINGS_FILE "cgi-bin/bookings.txt"

typedef struct {
  int id;
  char type[50];
  char name[100];
  char from_city[100];
  char to_city[100];
  char time[50];
  int price;
  int available_seats;
} Bus;

typedef struct {
  char username[50];
  char password[50];
} User;

int load_buses(Bus *buses, int max_buses) {
  FILE *f = fopen(DATA_FILE, "r");
  if (!f)
    return 0;

  int count = 0;
  char line[512];
  while (count < max_buses && fgets(line, sizeof(line), f)) {
    char *id_str = strtok(line, ",");
    char *type = strtok(NULL, ",");
    char *name = strtok(NULL, ",");
    char *from = strtok(NULL, ",");
    char *to = strtok(NULL, ",");
    char *time = strtok(NULL, ",");
    char *price_str = strtok(NULL, ",");
    char *seats_str = strtok(NULL, "\n");

    if (id_str && type && name && from && to && time && price_str &&
        seats_str) {
      buses[count].id = atoi(id_str);
      strncpy(buses[count].type, type, sizeof(buses[count].type) - 1);
      strncpy(buses[count].name, name, sizeof(buses[count].name) - 1);
      strncpy(buses[count].from_city, from, sizeof(buses[count].from_city) - 1);
      strncpy(buses[count].to_city, to, sizeof(buses[count].to_city) - 1);
      strncpy(buses[count].time, time, sizeof(buses[count].time) - 1);
      buses[count].price = atoi(price_str);
      buses[count].available_seats = atoi(seats_str);
      count++;
    }
  }
  fclose(f);
  return count;
}

void save_buses(Bus *buses, int count) {
  FILE *f = fopen(DATA_FILE, "w");
  if (!f)
    return;
  for (int i = 0; i < count; i++) {
    fprintf(f, "%d,%s,%s,%s,%s,%s,%d,%d\n", buses[i].id, buses[i].type,
            buses[i].name, buses[i].from_city, buses[i].to_city, buses[i].time,
            buses[i].price, buses[i].available_seats);
  }
  fclose(f);
}

// User functions unchanged
int load_users(User *users, int max_users) {
  FILE *f = fopen(USERS_FILE, "r");
  if (!f)
    return 0;
  int count = 0;
  char line[256];
  while (count < max_users && fgets(line, sizeof(line), f)) {
    char *u = strtok(line, ",");
    char *p = strtok(NULL, "\n");
    if (u && p) {
      strncpy(users[count].username, u, sizeof(users[count].username) - 1);
      strncpy(users[count].password, p, sizeof(users[count].password) - 1);
      count++;
    }
  }
  fclose(f);
  return count;
}

void to_lowercase(char *str) {
  for (; *str; ++str)
    *str = tolower((unsigned char)*str);
}
void urldecode(char *dst, const char *src) {
  char a, b;
  while (*src) {
    if ((*src == '%') && ((a = src[1]) && (b = src[2])) &&
        (isxdigit(a) && isxdigit(b))) {
      if (a >= 'a')
        a -= 'a' - 'A';
      else if (a >= 'A')
        a -= ('A' - 10);
      else
        a -= '0';
      if (b >= 'a')
        b -= 'a' - 'A';
      else if (b >= 'A')
        b -= ('A' - 10);
      else
        b -= '0';
      *dst++ = 16 * a + b;
      src += 3;
    } else if (*src == '+') {
      *dst++ = ' ';
      src++;
    } else {
      *dst++ = *src++;
    }
  }
  *dst++ = '\0';
}

void get_buses(const char *searchFrom, const char *searchTo) {
  Bus buses[100];
  int count = load_buses(buses, 100);

  char q_from[100] = {0};
  char q_to[100] = {0};

  if (searchFrom && strlen(searchFrom) > 0) {
    urldecode(q_from, searchFrom);
    to_lowercase(q_from);
  }
  if (searchTo && strlen(searchTo) > 0) {
    urldecode(q_to, searchTo);
    to_lowercase(q_to);
  }

  printf("Content-Type: application/json\n\n");
  printf("[\n");
  int printed = 0;
  for (int i = 0; i < count; i++) {
    int match = 1;

    char bus_from[100], bus_to[100];
    strncpy(bus_from, buses[i].from_city, 99);
    strncpy(bus_to, buses[i].to_city, 99);
    to_lowercase(bus_from);
    to_lowercase(bus_to);

    if (strlen(q_from) > 0 && !strstr(bus_from, q_from))
      match = 0;
    if (strlen(q_to) > 0 && !strstr(bus_to, q_to))
      match = 0;

    if (match) {
      if (printed > 0)
        printf(",");
      printf("\n  {\"id\": %d, \"type\": \"%s\", \"name\": \"%s\", \"from\": "
             "\"%s\", \"to\": \"%s\", \"time\": \"%s\", \"price\": %d, "
             "\"available_seats\": %d}",
             buses[i].id, buses[i].type, buses[i].name, buses[i].from_city,
             buses[i].to_city, buses[i].time, buses[i].price,
             buses[i].available_seats);
      printed++;
    }
  }
  printf("\n]\n");
}

/* User login/register and book_bus methods remain unchanged from logic
 * perspective */
/* User login/register and book_bus methods remain unchanged from logic
 * perspective */
void book_bus(int id, const char *username, const char *seat) {
  Bus buses[100];
  int count = load_buses(buses, 100);
  printf("Content-Type: application/json\n\n");
  for (int i = 0; i < count; i++) {
    if (buses[i].id == id) {
      if (buses[i].available_seats > 0) {
        buses[i].available_seats--;
        save_buses(buses, count);

        // Log booking
        FILE *f = fopen(BOOKINGS_FILE, "a");
        if (f) {
          time_t t = time(NULL);
          struct tm *tm = localtime(&t);
          char dateAndTime[100];
          strftime(dateAndTime, sizeof(dateAndTime), "%c", tm);
          int booking_id = rand() % 900000 + 100000;
          fprintf(f, "SFA%d,%s,%d,%s,%s\n", booking_id, username, id, seat,
                  dateAndTime);
          fclose(f);
        }

        printf("{\"status\": \"success\", \"message\": \"Seat booked "
               "successfully!\"}\n");
        return;
      } else {
        printf(
            "{\"status\": \"error\", \"message\": \"No seats available!\"}\n");
        return;
      }
    }
  }
  printf("{\"status\": \"error\", \"message\": \"Bus not found!\"}\n");
}

void get_user_bookings(const char *username) {
  printf("Content-Type: application/json\n\n");
  printf("[\n");
  FILE *f = fopen(BOOKINGS_FILE, "r");
  if (!f) {
    printf("]\n");
    return;
  }

  Bus buses[100];
  int bus_count = load_buses(buses, 100);
  int printed = 0;

  char line[512];
  while (fgets(line, sizeof(line), f)) {
    line[strcspn(line, "\n")] = 0;
    char *b_id = strtok(line, ",");
    char *uname = strtok(NULL, ",");
    char *bus_id_str = strtok(NULL, ",");
    char *seat = strtok(NULL, ",");
    char *date_time = strtok(NULL, "");

    if (b_id && uname && bus_id_str && seat && date_time) {
      if (strcmp(uname, username) == 0) {
        int bus_id = atoi(bus_id_str);
        char operator_name[100] = "Unknown Operator";
        char route[100] = "Unknown Route";
        int price = 0;
        for (int j = 0; j < bus_count; j++) {
          if (buses[j].id == bus_id) {
            strcpy(operator_name, buses[j].name);
            sprintf(route, "%s to %s", buses[j].from_city, buses[j].to_city);
            price = buses[j].price;
            break;
          }
        }
        if (printed > 0)
          printf(",\n");
        printf(
            "  {\"bookingId\": \"%s\", \"operator\": \"%s\", \"route\": "
            "\"%s\", \"seat\": \"%s\", \"price\": %d, \"dateAndTime\": \"%s\"}",
            b_id, operator_name, route, seat, price, date_time);
        printed++;
      }
    }
  }
  fclose(f);
  printf("\n]\n");
}

void get_param(const char *query, const char *key, char *out, int max_len) {
  out[0] = '\0';
  char search_key[100];
  snprintf(search_key, sizeof(search_key), "%s=", key);

  const char *start = strstr(query, search_key);
  if (!start)
    return;

  start += strlen(search_key);
  const char *end = strchr(start, '&');
  int len = end ? (end - start) : strlen(start);
  if (len >= max_len)
    len = max_len - 1;
  strncpy(out, start, len);
  out[len] = '\0';
}

void register_user(const char *username, const char *password) {
  User users[200];
  int count = load_users(users, 200);
  printf("Content-Type: application/json\n\n");
  for (int i = 0; i < count; i++) {
    if (strcmp(users[i].username, username) == 0) {
      printf("{\"status\": \"error\", \"message\": \"Username already "
             "exists!\"}\n");
      return;
    }
  }
  FILE *f = fopen(USERS_FILE, "a");
  if (f) {
    fprintf(f, "%s,%s\n", username, password);
    fclose(f);
    printf("{\"status\": \"success\", \"message\": \"Registered "
           "successfully!\"}\n");
  } else {
    printf("{\"status\": \"error\", \"message\": \"Server error: Cannot open "
           "users DB!\"}\n");
  }
}
void login_user(const char *username, const char *password) {
  User users[200];
  int count = load_users(users, 200);
  printf("Content-Type: application/json\n\n");
  for (int i = 0; i < count; i++) {
    if (strcmp(users[i].username, username) == 0 &&
        strcmp(users[i].password, password) == 0) {
      printf("{\"status\": \"success\", \"message\": \"Login successful!\", "
             "\"username\": \"%s\"}\n",
             username);
      return;
    }
  }
  printf("{\"status\": \"error\", \"message\": \"Invalid credentials!\"}\n");
}

int main() {
  char *req_method = getenv("REQUEST_METHOD");
  if (!req_method) {
    printf("Status: 400 Bad Request\nContent-Type: text/plain\n\nNo "
           "REQUEST_METHOD.");
    return 0;
  }
  char *query_string = getenv("QUERY_STRING");
  char *content_length = getenv("CONTENT_LENGTH");

  if (strcmp(req_method, "GET") == 0) {
    if (query_string && strstr(query_string, "action=get_bookings")) {
      char username[50] = {0};
      char decoded_user[50] = {0};
      get_param(query_string, "username", username, 50);
      urldecode(decoded_user, username);
      get_user_bookings(decoded_user);
      return 0;
    } else if (query_string && strstr(query_string, "action=get_buses")) {
      char from_term[100] = {0};
      char to_term[100] = {0};
      get_param(query_string, "from", from_term, 100);
      get_param(query_string, "to", to_term, 100);
      get_buses(from_term, to_term);
      return 0;
    }
  } else if (strcmp(req_method, "POST") == 0) {
    if (content_length) {
      int len = atoi(content_length);
      char *buf = malloc(len + 1);
      if (buf) {
        fread(buf, 1, len, stdin);
        buf[len] = '\0';

        char action[50];
        get_param(buf, "action", action, 50);

        if (strcmp(action, "book") == 0) {
          char bus_id_str[20];
          char username[50];
          char decoded_user[50];
          char seat[10];

          get_param(buf, "bus_id", bus_id_str, 20);
          get_param(buf, "username", username, 50);
          get_param(buf, "seat", seat, 10);

          urldecode(decoded_user, username);
          int bus_id = atoi(bus_id_str);
          if (bus_id > 0)
            book_bus(bus_id, decoded_user, seat);
          else
            printf("Content-Type: application/json\n\n{\"status\": \"error\", "
                   "\"message\": \"Invalid bus ID!\"}\n");
        } else if (strcmp(action, "login") == 0) {
          char username[50], password[50];
          get_param(buf, "username", username, 50);
          get_param(buf, "password", password, 50);
          login_user(username, password);
        } else if (strcmp(action, "register") == 0) {
          char username[50], password[50];
          get_param(buf, "username", username, 50);
          get_param(buf, "password", password, 50);
          register_user(username, password);
        } else {
          printf("Content-Type: application/json\n\n{\"status\": \"error\", "
                 "\"message\": \"Unknown POST action!\"}\n");
        }
        free(buf);
        return 0;
      }
    }
  }

  printf("Content-Type: application/json\n\n");
  printf("{\"status\": \"error\", \"message\": \"Invalid request\"}\n");
  return 0;
}
